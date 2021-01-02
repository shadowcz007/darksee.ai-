//https://wiki.mbalib.com/wiki/%E8%AE%A1%E7%AE%97%E6%9C%BA
export default function (document) {
   // console.log(document)
    let ps=Array.from(document.querySelectorAll('p'),(p,i)=>{
        // console.log(i,p.innerText);
        let text=p.innerText;
        let isText=text.replace(/\d+|\s/ig,'').trim();
        if(isText!=""&&isText.length>5){
            return {
                id:i,
                //怎么匹配到这个节点
                query:"p",
                //通过query和innerText
                text:p.innerText
            }
        }else{
            return
        }
        
    }).filter(f=>{return !!f});

    return ps
  };


