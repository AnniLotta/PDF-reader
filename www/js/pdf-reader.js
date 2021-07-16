//Sets up the pdf.js library
pdfjsLib.GlobalWorkerOptions.workerSrc = '/../pdfjs/build/pdf.worker.js'
pdfjsLib.workerSrc = '/../pdfjs/build/pdf.worker.js';

//Defines the directory and the names of the files that will be shown
const PDF_FILES_DIRECTORY = "../sampleFiles/";
files = ['samplePDF1.pdf', 'samplePDF2.pdf', 'samplePDF3.pdf', 'samplePDF4.pdf', 'samplefile_with_a_long_filename.pdf'];

  //                                      //
 //  Creating thumbnails for every PDF   //
//                                      //

//When the application is opened, creates the thumbnails for every file and render them on the main page//
for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
    //Create a canvas for the file
    document.getElementById('thumbnails').innerHTML += `<canvas id="canvas${fileIdx}"></canvas>`;

    //Defines the file path and download the file
    const filePath = PDF_FILES_DIRECTORY + files[fileIdx];
    pdfjsLib.getDocument(filePath).promise.then(function (pdf) {

        //Gets the title, date and filesize of the file
        pdf.getMetadata().then(function (data) {

            let title = data.info.Title;
            if (title.length > 17) {
                title = title.substr(0, 14) + '...';
            }
            let creationDate = data.info.CreationDate;
            let filesize = data.contentLength;
            creationDate = `${creationDate.substr(2, 4)}/${creationDate.substr(6, 2)}/${creationDate.substr(4, 2)}`

            //Gets the first page of the file
            pdf.getPage(1).then(function (page) {

                //Defines the page rendering settings
                let scale = 1;
                let viewport = page.getViewport({ scale: scale });
                let canvasElement = document.getElementById(`canvas${fileIdx}`);
                let ctx = canvasElement.getContext('2d');

                canvasElement.height = viewport.height;
                canvasElement.width = viewport.width;

                let renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };

                //Renders the page on the canvas
                let renderTask = page.render(renderContext);
                renderTask.promise.then(function () {

                    //Makes an image of the canvas and creates a thumbnail of it
                    let imgSrc = canvasElement.toDataURL();
                    let img =
                        `<div class="thumbnail popup-open" data-popup="#pdf-popup" data-file-path="${filePath}">
                            <img class="thumbnail-img" src="${imgSrc}"></img>
                            <p class="thumbnail-title">${title}</p>
                            <div class="thumbnail-txt">
                                <p >${creationDate}</p>
                                <p>${getFilesize(filesize)}</p>
                            </div>
                        </div>`;
                    document.getElementById('thumbnails').innerHTML += img;

                    //Removes the canvas as it was used only for creating the thumbnail image
                    document.getElementById(`canvas${fileIdx}`).remove();
                })
            })
        })
    })

}

//Converts bytes into more readable form for filesize
function getFilesize(bytes) {
    let s = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let e = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, Math.floor(e))).toFixed(2) + " " + s[e];
}

//Detects a click on an thumbnail and opens the file
$$(document).on("click", ".thumbnail", function () {
    let filePath = $$(this).data("file-path");
    const title = filePath.substr(PDF_FILES_DIRECTORY.length);
    pdfjsLib.getDocument(filePath).promise.then(function (doc) {
        pdfDoc = doc;
        document.getElementById('page_count').textContent = pdfDoc.numPages;
        // Initial/first page rendering
        pageNum = 1;
        renderPage(pageNum);
        setArrows();
    });
})

  //                    //
 //   Opening a PDF    //
//                    //

//Variables for opening the PDF
let pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    pageNumPending = null;

//Gets page info from a document, resizes the canvas accordingly and renders the page.
function renderPage(num) {
    pageRendering = true;
    // Using promise to fetch the page
    pdfDoc.getPage(num).then(function (page) {
        let canvas = document.getElementById('pdf-canvas');
        let ctx = canvas.getContext('2d');
        let scale = 1;
        let viewport = page.getViewport({ scale: scale });
        if (viewport.height < viewport.width) {
            viewport = page.getViewport({ scale: 600 / viewport.height, rotation: 90 });
        } else {
            viewport = page.getViewport({ scale: 600 / viewport.width });
        }
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        let renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        let renderTask = page.render(renderContext);

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

/*If another page rendering in progress, waits until the rendering is finished. 
Otherwise executes rendering immediately.*/
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

  //                                  //
 //  Changing pages on the open PDF  //
//                                  //

//Detects clicks on the arrow buttons to change the page
document.getElementById('prev').addEventListener('click', prevPage);
document.getElementById('next').addEventListener('click', nextPage);

//Canvas element that shows the PDF 
let canvasElem = document.getElementById('pdf-canvas');

//Uses Hammer for detecting swipes on the canvas to change the page
var mc = new Hammer(canvasElem);
mc.on("swipeleft swiperight", function (ev) {
    const touch = ev.type;
    if (touch === 'swiperight') {
        prevPage();
    } else if (touch === 'swipeleft') {
        nextPage();
    }
});

//Detects clicks on the canvas to change the page
canvasElem.addEventListener("click", function (e) {
    clickOnCanvas(canvasElem, e);
});

//Detects clicks on the canvas and changes the page according to which side of the canvas was clicked
function clickOnCanvas(canvas, event) {
    //Gets the x-coordinate of the click
    let rect = canvas.getBoundingClientRect();
    let x = event.clientX - rect.left;
    //If the click was on the left side -> previous page, on the right side -> next page
    if (x < rect.width / 2) {
        prevPage();
    }
    else {
        nextPage();
    }
}

//Displays previous page
function prevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    setArrows();
    queueRenderPage(pageNum);
}

//Displays next page
function nextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    setArrows();
    queueRenderPage(pageNum);
}

//Shows and hides the arrow buttons according to the page number
function setArrows() {
    let nextIcon = document.getElementById("next-icon");
    let prevIcon = document.getElementById("prev-icon");
    nextIcon.style.display = "block";
    prevIcon.style.display = "block";
    //If the file has only one page, don't show buttons
    if (pdfDoc.numPages === 1) {
        nextIcon.style.display = "none";
        prevIcon.style.display = "none";
    } else if (pageNum <= 1) {
        //If the first page is shown, don't show the previous-button
        prevIcon.style.display = "none";
    } else if (pageNum >= pdfDoc.numPages) {
        //If the the last page is shown, don't show the next-button
        nextIcon.style.display = "none";
    }
}