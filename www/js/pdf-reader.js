// Loaded via <script> tag, create shortcut to access PDF.js exports.
//let pdfjsLib = window['pdfjs-dist/build/pdf'];
//console.log(pdfjsLib)

// The workerSrc property shall be specified.
//pdfjsLib.GlobalWorkerOptions.workerSrc = '/../pdfjs/build/pdf.worker.js';
pdfjsLib.GlobalWorkerOptions.workerSrc = '/../pdfjs/build/pdf.worker.js';
// set the pdfjs worker source. not sure if PDFjs uses 'webworkers' API of HTML5
pdfjsLib.workerSrc = '/../pdfjs/build/pdf.worker.js';

var url = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf';

const PDF_FILES_DIRECTORY = "../sampleFiles/";
// these files should exist in the given path to display correctly
files = ['samplePDF1.pdf', 'samplePDF2.pdf'];

for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
    document.getElementById('thumbnails').innerHTML += `<canvas id="canvas${fileIdx}"></canvas>`;
}

for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
    //const filePath = PDF_FILES_DIRECTORY + files[fileIdx]; //The files are found on computer but not on device
    const filePath = url; //Using this to test 
    let loadingTask = pdfjsLib.getDocument(filePath);
    console.log(loadingTask.promise) //The promise is empty on device, why?
    loadingTask.promise.then(function (pdf) {
        pdf.getMetadata().then(function (data) {
            let title = data.info.Title;
            let creationDate = 'teststring'//data.info.CreationDate;
            let fileSize = data.contentLength;
            creationDate = `${creationDate.substr(2, 4)}/${creationDate.substr(6, 2)}/${creationDate.substr(4, 2)}`

            pdf.getPage(1).then(function (page) {
                var scale = 1;
                var viewport = page.getViewport({ scale: scale });
                let canvasElement = document.getElementById(`canvas${fileIdx}`);
                const ctx = canvasElement.getContext('2d');

                canvasElement.height = viewport.height;
                canvasElement.width = viewport.width;

                let renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };

                let renderTask = page.render(renderContext);
                renderTask.promise.then(function () {
                    var imgSrc = canvasElement.toDataURL();
                    var img =
                        `<div class="thumbnail popup-open" data-popup="#pdf-popup" data-file-path="${filePath}">
                        <img class="thumbnail-img" src="${imgSrc}"></img>
                        <p class="thumbnail-title thumbnail-txt">${title}</p>
                        <p class="thumbnail-txt thumbnail-info">${creationDate}</p>
                        <p class="thumbnail-txt thumbnail-info">${readablizeFilesize(fileSize)}</p>
                    </div>`;
                    document.getElementById('thumbnails').innerHTML += img;
                    document.getElementById(`canvas${fileIdx}`).remove();
                })
            })
        })
    })

}

function readablizeFilesize(bytes) {
    var s = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    var e = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, Math.floor(e))).toFixed(2) + " " + s[e];
}

var pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    pageNumPending = null,
    scale = 0.8,
    canvas = document.getElementById('pdf-canvas'),
    ctx = canvas.getContext('2d');

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
function renderPage(num) {
    pageRendering = true;
    // Using promise to fetch the page
    pdfDoc.getPage(num).then(function (page) {
        var viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        var renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        var renderTask = page.render(renderContext);

        // Wait for rendering to finish
        renderTask.promise.then(function () {
            pageRendering = false;
            if (pageNumPending !== null) {
                // New page rendering is pending
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });

    // Update page counters
    document.getElementById('page_num').textContent = num;
}

/**
 * If another page rendering in progress, waits until the rendering is
 * finised. Otherwise, executes rendering immediately.
 */
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

/**
 * Displays previous page.
 */
function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    queueRenderPage(pageNum);
}
document.getElementById('prev').addEventListener('click', onPrevPage);

/**
 * Displays next page.
 */
function onNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    queueRenderPage(pageNum);
}
document.getElementById('next').addEventListener('click', onNextPage);


$$(document).on("click", ".thumbnail", function () {
    let filePath = $$(this).data("file-path");
    pdfjsLib.getDocument(filePath).promise.then(function (pdfDoc_) {
        pdfDoc = pdfDoc_;
        document.getElementById('page_count').textContent = pdfDoc.numPages;

        // Initial/first page rendering
        renderPage(pageNum);
    });
})