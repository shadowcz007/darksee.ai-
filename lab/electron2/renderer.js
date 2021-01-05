const { ipcRenderer } = require('electron');

document.addEventListener('paste', async(event) => {
    var isChrome = false;
    if (event.clipboardData || event.originalEvent) {
        //某些chrome版本使用的是event.originalEvent
        var clipboardData = (event.clipboardData || event.originalEvent.clipboardData);
        if (clipboardData.items) {
            // for chrome
            var items = clipboardData.items,
                len = items.length,
                blob = null;
            isChrome = true;
            for (var i = 0; i < len; i++) {

                if ((items[i].kind == 'string') &&
                    (items[i].type.match('^text/plain'))) {
                    items[i].getAsString(function(s) {
                        openUrl(s)
                    })
                } else if ((items[i].kind == 'string') &&
                    (items[i].type.match('^text/html'))) {
                    // Drag data item is HTML
                    console.log("... Drop: HTML");
                } else if ((items[i].kind == 'string') &&
                    (items[i].type.match('^text/uri-list'))) {
                    // Drag data item is URI
                    console.log("... Drop: URI");
                } else if ((items[i].kind == 'file') &&
                    (items[i].type.match('^image/'))) {
                    // Drag data item is an image file
                    //图像
                    blob = items[i].getAsFile();
                    console.log("... Drop: File ", blob);
                }
            };

        }
    }
});

function openUrl(url) {
    ipcRenderer.send('open-url', { url: url })
}

ipcRenderer.on('bert-similar-reply', (event, arg) => {
    console.log(event, arg)
})