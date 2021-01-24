const { parseGIF, decompressFrames } = require("gifuct-js");
const GIFJS = require("gif.js/dist/gif");
const path = require("path"),
    fs = require("fs");
let gifWorker = fs.readFileSync(path.join(__dirname, "../node_modules/gif.js/dist/gif.worker.js"));
gifWorker = window.URL.createObjectURL(new Blob([gifWorker], { type: "application/javascript" }));

class Gif {
    constructor() {

        // user canvas
        var c = document.createElement('canvas')
        this.ctx = c.getContext('2d')
            // gif patch canvas
        var tempCanvas = document.createElement('canvas')
        this.tempCtx = tempCanvas.getContext('2d')
            // full gif canvas
        var gifCanvas = document.createElement('canvas')
        this.gifCtx = gifCanvas.getContext('2d')

        this.loadedFrame = null;
        this.frameIndex = 0;
        this.height = 0
        this.frameImageData;

        //最后结果
        this.framesResult = [];

        //
        this.gif = new GIFJS({
            workers: 2,
            quality: 10,
            workerScript: gifWorker
        });
    }
    start(buff) {
        let gif = parseGIF(buff);

        let frames = decompressFrames(gif, true);
        console.log(frames);
        this.renderGIF(frames);

    }

    renderGIF(frames) {
        this.loadedFrames = frames
        this.frameIndex = 0

        this.width = frames[0].dims.width
        this.height = frames[0].dims.height

        this.ctx.canvas.width = this.width
        this.ctx.canvas.height = this.height

        this.gifCtx.canvas.width = this.width
        this.gifCtx.canvas.height = this.height

        this.renderFrame()
    }

    renderFrame() {
        let playing = true;
        // get the frame
        var frame = this.loadedFrames[this.frameIndex]

        var start = new Date().getTime()

        this.gifCtx.clearRect(0, 0, this.width, this.height)

        // draw the patch
        this.drawPatch(frame)

        // perform manipulation
        this.manipulate()

        // update the frame index
        this.frameIndex++
            if (this.frameIndex >= this.loadedFrames.length) {
                this.frameIndex = 0;
                playing = false;
            };
        this.gif.addFrame(this.ctx.canvas, { delay: 200, copy: true });
        // this.framesResult.push(this.createFrame());

        var end = new Date().getTime()
        var diff = end - start

        if (playing) {
            // delay the next gif frame
            setTimeout(() => {
                // requestAnimationFrame(renderFrame)
                this.renderFrame();
            }, Math.max(0, Math.floor(frame.delay - diff)))
        } else {
            // console.log(this.framesResult)

            this.gif.on('finished', function(blob) {
                window.open(URL.createObjectURL(blob));
            });

            this.gif.render();
        }
    }

    createFrame() {
        let c = document.createElement("canvas");
        let ctx = c.getContext("2d")
        c.width = this.width;
        c.height = this.height;
        ctx.drawImage(this.ctx.canvas, 0, 0, this.width, this.height)
        return c
    }

    drawPatch(frame) {
        var dims = frame.dims

        if (!this.frameImageData ||
            dims.width != this.frameImageData.width ||
            dims.height != this.frameImageData.height
        ) {
            this.tempCtx.canvas.width = dims.width
            this.tempCtx.canvas.height = dims.height
            this.frameImageData = this.tempCtx.createImageData(dims.width, dims.height)
        }

        // set the patch data as an override
        this.frameImageData.data.set(frame.patch)

        // draw the patch back over the canvas
        this.tempCtx.putImageData(this.frameImageData, 0, 0)

        this.gifCtx.drawImage(this.tempCtx.canvas, dims.left, dims.top)
    }

    manipulate() {
        var pixelPercent = 100
        var imageData = this.gifCtx.getImageData(0, 0, this.width, this.height)

        // do pixelation
        var pixelsX = 5 + Math.floor((pixelPercent / 100) * (this.width - 5))
        var pixelsY = (pixelsX * this.height) / this.width

        if (pixelPercent != 100) {
            this.ctx.mozImageSmoothingEnabled = false
            this.ctx.webkitImageSmoothingEnabled = false
            this.ctx.imageSmoothingEnabled = false
        }

        this.ctx.putImageData(imageData, 0, 0)
        this.ctx.drawImage(this.ctx.canvas, 0, 0, this.width, this.height, 0, 0, pixelsX, pixelsY)
        this.ctx.drawImage(this.ctx.canvas, 0, 0, pixelsX, pixelsY, 0, 0, this.width, this.height)
    }
}


module.exports = Gif;