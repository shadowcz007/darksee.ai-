import Document from './Document.js';
import Stopwords from './Stopwords.js';

// Implements TF-IDF (Term Frequency - Inverse Document Frequency) using BM25 weighting, from:
// https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-356.pdf
// Calculates term frequencies, term weights, and term vectors, and can return results for a given
// query. Creates a Document for every text and also manages stopwords for the collection.
export default class Corpus {

  // - "names" and "texts" are parallel arrays containing the document identifiers and the full
  //   texts of each document
  // - "useDefaultStopwords" and "customStopwords" are optional parameters that are passed along to
  //   the Stopwords instance
  // - K1 and b are tuning constants from the reference technical report:
  //   - K1 modifies term frequency (higher values increase the influence)
  //   - b modifies document length (between 0 and 1; 1 means that long documents are repetitive and
  //     0 means they are multitopic)
  constructor(names, texts, useDefaultStopwords = true, customStopwords = [], K1 = 2.0, b = 0.75) {
    this._stopwords = new Stopwords(useDefaultStopwords, customStopwords);
    this._K1 = K1;
    this._b = b;
    this._documents = new Map();
    for (let i = 0; i < texts.length; i++) {
      this._documents.set(names[i], new Document(texts[i]));
    }
    this._collectionFrequencies = null;
    this._collectionFrequencyWeights = null;
    this._documentVectors = null;
  }

  // Internal method that determines how many documents in the collection contain each term
  _calculateCollectionFrequencies() {
    this._collectionFrequencies = new Map();
    for (const document of this._documents.values()) {
      document
        .getUniqueTerms()
        .filter(t => !this._stopwords.includes(t))
        .forEach(term => {
          if (this._collectionFrequencies.has(term)) {
            const n = this._collectionFrequencies.get(term);
            this._collectionFrequencies.set(term, n + 1);
          } else {
            this._collectionFrequencies.set(term, 1);
          }
        });
    }
  }

  // Returns an array containing the unique terms used in the corpus (excluding stopwords)
  getTerms() {
    if (!this._collectionFrequencies) {
      this._calculateCollectionFrequencies();
    }
    return Array.from(this._collectionFrequencies.keys());
  }

  // Returns the number of documents in the collection that contain the given term
  getCollectionFrequency(term) {
    if (!this._collectionFrequencies) {
      this._calculateCollectionFrequencies();
    }
    if (this._collectionFrequencies.has(term)) {
      return this._collectionFrequencies.get(term);
    } else {
      return null;
    }
  }

  // Returns the Document corresponding to the given identifier
  getDocument(identifier) {
    return this._documents.get(identifier);
  }

  // Returns an array of all identifiers in the corpus
  getDocumentIdentifiers() {
    return Array.from(this._documents.keys());
  }

  // Returns an array of the terms that the documents with these two identifiers have in common;
  // each array entry is a pair of a term and a score, and the array is sorted in descending order
  // by the score, with a maximum length of "maxTerms" (which is optional and defaults to 10)
  getCommonTerms(identifier1, identifier2, maxTerms = 10) {
    const vector1 = this.getDocumentVector(identifier1);
    const vector2 = this.getDocumentVector(identifier2);
    const commonTerms = Array.from(vector1.entries())
      .map(([term, cw]) => [term, cw * vector2.get(term)])
      .filter(d => d[1] > 0);
    return commonTerms.sort((a, b) => b[1] - a[1]).slice(0, maxTerms);
  }

  // Internal method to calculate collection frequency weight (a.k.a. inverse document frequency).
  // Compared to the formula in the original paper, we add 1 to N (the number of documents in the
  // collection) so that terms which appear in every document (and are not stopwords) get a very
  // small CFW instead of zero (and therefore, later, get a very small Combined Weight instead of
  // zero, meaning that they can still be retrieved by queries and appear in similarity
  // calculations).
  _calculateCollectionFrequencyWeights() {
    if (!this._collectionFrequencies) {
      this._calculateCollectionFrequencies();
    }
    this._collectionFrequencyWeights = new Map();
    const N = this._documents.size;
    for (const [term, n] of this._collectionFrequencies.entries()) {
      this._collectionFrequencyWeights.set(term, Math.log(N + 1) - Math.log(n));
    }
  }

  // Returns the collection frequency weight (or inverse document frequency) for the given term
  getCollectionFrequencyWeight(term) {
    if (!this._collectionFrequencyWeights) {
      this._calculateCollectionFrequencyWeights();
    }
    if (this._collectionFrequencyWeights.has(term)) {
      return this._collectionFrequencyWeights.get(term);
    } else {
      return null;
    }
  }

  // Internal method that creates, for each document, a Map from each term to its corresponding
  // combined (TF-IDF) weight for that document
  _calculateDocumentVectors() {
    if (!this._collectionFrequencyWeights) {
      this._calculateCollectionFrequencyWeights();
    }
    this._documentVectors = new Map();
    const K1 = this._K1;
    const b = this._b;
    // Total length of the collection, calculated here as the sum of all document lengths
    const totalLength = Array.from(this._documents.values())
      .map(d => d.getLength())
      .reduce((a, b) => a + b, 0);
    const avgLength = totalLength / this._documents.size;
    for (const [identifier, document] of this._documents) {
      const vector = new Map();
      const ndl = document.getLength() / avgLength;
      for (const [term, idf] of this._collectionFrequencyWeights.entries()) {
        // Calculate the combined weight (a.k.a. TF-IDF weight) for this term in this document
        const tf = document.getTermFrequency(term);
        const cw = tf ? (idf * tf * (K1 + 1)) / (K1 * (1 - b + b * ndl) + tf) : 0.0;
        vector.set(term, cw);
      }
      this._documentVectors.set(identifier, vector);
    }
  }

  // Returns a Map from terms to their corresponding combined (TF-IDF) weights, for the document
  // with the given identifier
  getDocumentVector(identifier) {
    if (!this._documentVectors) {
      this._calculateDocumentVectors();
    }
    return this._documentVectors.get(identifier);
  }

  // Returns an array containing the terms with the highest combined (TF-IDF) weights for the
  // document with the given identifier; each array entry is a pair of a term and a weight, and
  // the array is sorted in descending order by the weight, with a maximum length of "maxTerms"
  getTopTermsForDocument(identifier, maxTerms = 30) {
    const vector = this.getDocumentVector(identifier);
    if (!vector) return [];
    const sortedTerms = Array.from(vector.entries())
      .filter(d => d[1] > 0.0)
      .sort((a, b) => b[1] - a[1]); // descending order
    return sortedTerms.slice(0, maxTerms);
  }

  // Returns an array representing the highest scoring documents for the given query; each array
  // entry is a pair of a document identifier and a score, and the array is sorted in descending
  // order by the score. The score for a document is the total combined weight of each query term
  // that appears in the document.
  getResultsForQuery(query) {
    if (!query || typeof query !== 'string' || query.length === 0) {
      return [];
    }
    const terms = new Document(query).getUniqueTerms();
    const scores = this.getDocumentIdentifiers().map(d => {
      const vector = this.getDocumentVector(d);
      let score = 0.0;
      terms.forEach(t => {
        const weight = vector.get(t);
        if (weight) {
          score += weight;
        }
      });
      return [d, score];
    });
    return scores.filter(d => d[1] > 0).sort((a, b) => b[1] - a[1]);
  }

  // Returns the Stopwords instance that is being used by this corpus (for inspection or debugging)
  getStopwords() {
    return this._stopwords;
  }
}
