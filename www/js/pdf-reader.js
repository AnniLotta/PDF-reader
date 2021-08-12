//Defines the directory and the names of the files that will be shown
const PDF_FILES_DIRECTORY = 'sampleFiles/';
files = ['samplePDF1.pdf', 'samplePDF2.pdf', 'samplePDF3.pdf', 'samplePDF4.pdf', 'samplefile_with_a_long_filename.pdf'];

//Tries to set up the PDF.js library
let pdfjsDefined = true;
try {
    //Sets up the PDF.js library
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs/build/pdf.worker.js'
    pdfjsLib.workerSrc = 'pdfjs/build/pdf.worker.js';
} catch (e) {
    pdfjsDefined = false;
    document.getElementById('thumbnails').innerText = 'This browser/platform does not support PDF.js.'
}

//Variables for opening a PDF
let pdfDoc = null,
    pageNum = 1,                //The number of the open page of the open file
    pageRendering = false,      //Is there a page rendering process ongoing
    pageNumPending = null;      //Page that's in the rendering queue

//Variables for zooming the currently open page and moving it around
let moveXAmount = 0,            //How much a page is moved horizontally on the canvas 
    moveYAmount = 0,            //How much a page is moved vertically on the canvas 
    pageImage = new Image(),    //The currently open page as an image
    prevDeltaX = 0,             //The previous horizontal movement of the page when dragging it around
    prevDeltaY = 0,             //The previous vertical movement of the page when dragging it around
    pageScale = 1;              //The scale of the currently open page, 1 => fully zoomed out

const pdfCanvas = document.getElementById("pdf-canvas"); //The canvas where the pages are drawn

//When the application is opened, creates the thumbnails for every file and renders them on the main page
async function createThumbnails() {
    //Hide thumbnails to show all of them at the same time and display loading icon
    document.getElementById('thumbnails').style.visibility = "hidden";
    document.getElementById('loading').style.display = "block";
    for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        //Create a canvas for the file
        document.getElementById('thumbnails').innerHTML += `<canvas class="tempcanvas" id="canvas${fileIdx}"></canvas>`;

        //Defines the file path and download the file
        const filePath = PDF_FILES_DIRECTORY + files[fileIdx];

        let pdf = await pdfjsLib.getDocument(filePath).promise;
        //Gets the title, date and filesize of the file
        let data = await pdf.getMetadata();
        let title = data.info.Title;
        if (title.length > 17) {
            title = title.substr(0, 14) + '...';
        }
        let creationDate = data.info.CreationDate;
        let filesize = '';
        if (data.contentLength) filesize = getFilesize(data.contentLength);
        creationDate = `${creationDate.substr(2, 4)}/${creationDate.substr(6, 2)}/${creationDate.substr(4, 2)}`

        //Gets the first page of the file
        let page = await pdf.getPage(1);

        //Defines the page rendering settings
        let viewport = page.getViewport({ scale: 1 });
        let canvasElement = document.getElementById(`canvas${fileIdx}`);
        let ctx = canvasElement.getContext('2d');

        //Sets canvas dimensions
        canvasElement.height = viewport.height;
        canvasElement.width = viewport.width;

        let renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        //Renders the page on the canvas
        await page.render(renderContext).promise;
        //Makes an image of the canvas and creates a thumbnail of it
        let imgSrc = canvasElement.toDataURL();
        let img =
            `<div class="thumbnail popup-open" data-popup="#pdf-popup" data-file-path="${filePath}">
                        <img class="thumbnail-img" src="${imgSrc}"></img>
                        <p class="thumbnail-title">${title}</p>
                        <div class="thumbnail-txt">
                            <p>${creationDate}</p>
                            <p>${filesize}</p>
                        </div>
                    </div>`;
        document.getElementById('thumbnails').innerHTML += img;

        //Removes the canvas as it was used only for creating the thumbnail image
        document.getElementById(`canvas${fileIdx}`).remove();
    }
    //Hide the loading icon and show the thumbnails
    document.getElementById('loading').style.display = "none";
    document.getElementById('thumbnails').style.visibility = "visible";
}

function registerEvents() {
    //Detect clicks on thumbnails to open PDFs
    detectThumbnailClicks();

    //Detect clicks on the arrow buttons to change the page of the open PDF
    detectArrowClicks();

    //Detect swipes on the open PDF canvas to change pages
    detectCanvasGestures();
}

//Detects a click on an thumbnail and opens the file
function detectThumbnailClicks() {
    $$(document).on("click", ".thumbnail", function () {
        let filePath = $$(this).data("file-path");

        //Empties the canvas before new rendering
        const ctx = pdfCanvas.getContext('2d');
        ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);

        //Loads the file and renders the first page
        pdfjsLib.getDocument(filePath).promise.then(function (doc) {
            pdfDoc = doc;
            document.getElementById('page_count').textContent = pdfDoc.numPages;
            // Initial/first page rendering
            pageNum = 1;
            renderPage(pageNum);
            setArrows();
        });
    })
}

//Gets page info from a document, resizes the canvas accordingly and renders the page.
async function renderPage(num) {

    zoom(true, true); //Resets the zoom
    pageRendering = true;

    // Using a promise to fetch the page
    let page = await pdfDoc.getPage(num);

    //Defines the page rendering settings
    const ctx = pdfCanvas.getContext('2d');
    let viewport = page.getViewport({ scale: 1 });

    //Fits the PDF to the page
    if (viewport.height < viewport.width) {
        //If height < width, rotates the PDF 90 degrees
        viewport = page.getViewport({ scale: 600 / viewport.height, rotation: 90 });
    } else {
        viewport = page.getViewport({ scale: 600 / viewport.width });
    }
    pdfCanvas.height = viewport.height;
    pdfCanvas.width = viewport.width;

    // Set the render context for the PDF
    let renderContext = {
        canvasContext: ctx,
        viewport: viewport
    };

    // Wait for rendering to finish
    await page.render(renderContext).promise;
    pageRendering = false;

    //Renders the next page on the rendering queue
    if (pageNumPending !== null) {
        // New page rendering is pending
        renderPage(pageNumPending);
        pageNumPending = null;
    }

    // Update the page counter
    document.getElementById('page_num').textContent = num;

    //Sets the source for the image that is used when a page is zoomed and moved
    pageImage.src = pdfCanvas.toDataURL();
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

//Detects clicks on the arrow buttons to change the page
function detectArrowClicks() {
    document.getElementById('prev').addEventListener('click', function () {
        changePage(-1);
    });
    document.getElementById('next').addEventListener('click', function () {
        changePage(1);
    });
}

//Uses Hammer for detecting swipes on the canvas to change the page
function detectCanvasGestures() {

    let mc = new Hammer(pdfCanvas);
    //Enables pinches on the canvas
    mc.get('pinch').set({
        enable: true
    });

    mc.on("swipeleft swiperight pinch pinchend pan tap", function (e) {
        switch (e.type) {
            case 'swiperight': //Changes to the previous page when swiped right
                if (pageScale === 1) changePage(-1);
                break;
            case 'swipeleft': //Changes to the next page when swiped left
                if (pageScale === 1) changePage(1);
                break;

            case 'pinch': //Zooms in and out when pinched
                pdfCanvas.style.transform = `scale(${restrictZoom(e.scale * pageScale)})`;
                setArrows(true); //Hides the arrow buttons when the canvas is zoomed
                break;
            case 'pinchend': //Sets the canvas scaling when pinching ends
                pageScale = restrictZoom(e.scale * pageScale);
                if (pageScale === 1) buildcanvas(); //If the page is fully zoomed out, sets it back to the center of the canvas
                break;

            case 'pan': //Moves the page on the canvas when zoomed in and dragged
                if (pageScale > 1 && !(prevDeltaX === e.deltaX && prevDeltaY === e.deltaY)) {
                    moveXAmount -= prevDeltaX - e.deltaX;
                    moveYAmount -= prevDeltaY - e.deltaY;
                    buildcanvas();
                }
                //Saves the new changes for the next pan event
                prevDeltaX = e.deltaX;
                prevDeltaY = e.deltaY;
                if (e.isFinal) { //If it's the last pan of the dragging, resets the change variables
                    prevDeltaX = 0;
                    prevDeltaY = 0;
                }
                break;

            case 'tap': //Changes the page when its sides are clicked/tapped
                //If the click was on the left side -> previous page, on the right side -> next page
                if (e.center.x < pdfCanvas.width / 2) {
                    changePage(-1);
                }
                else {
                    changePage(1);
                }
                break;
        }
    });
}

//Zooms in and out when the zoom buttons are used
function zoom(isIn, fullOut) {

    if (fullOut) {
        pageScale = 1;
    } else {
        isIn ? pageScale = restrictZoom(pageScale *= 1.10) : pageScale = restrictZoom(pageScale *= 0.90);
    }

    pdfCanvas.style.transform = `scale(${pageScale})`;
    setArrows(true); //Hides the arrow buttons when zoomed
    if (pageScale === 1) buildcanvas(); //Resets the page location if the scale is 1
}

//Restricts the zoom so that it doesn't zoom too far or close
function restrictZoom(zoom) {
    let newZoom = zoom;
    if (zoom <= 1) newZoom = 1;
    else if (zoom > 8) newZoom = 8;
    return newZoom;
}

//Changes the page to the next page if num = 1 and to the previous page if num = -1
function changePage(num) {
    const newPage = pageNum + num;
    if (newPage < 1 || newPage > pdfDoc.numPages) return;
    pageNum = newPage;
    setArrows(); //Hide and show arrow buttons according to the page number
    queueRenderPage(pageNum);
}

//Shows and hides the arrow buttons according to the page number
function setArrows(hideAll) {
    let nextIcon = document.getElementById("next-icon");
    let prevIcon = document.getElementById("prev-icon");
    nextIcon.style.display = "block";
    prevIcon.style.display = "block";
    //If the file has only one page, don't show buttons
    if (pdfDoc.numPages === 1 || hideAll) {
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

//Converts bytes into more readable form for filesize
function getFilesize(bytes) {
    let s = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let e = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, Math.floor(e))).toFixed(2) + " " + s[e];
}

function main() {
    //Create a thumbnail to each PDF
    createThumbnails();
    //Register events for opening PDFs and navigating on their pages
    registerEvents();
}

//Shows the correct part of the page when it is moved on the canvas
function buildcanvas() {
    let ctx = pdfCanvas.getContext('2d');

    //Reset the page location if the page is fully zoomed out
    if (pageScale === 1) {
        moveXAmount = 0;
        moveYAmount = 0;
        setArrows();
    }

    //Clear the canvas and draw the new picture on it
    ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    ctx.save();
    ctx.drawImage(pageImage, moveXAmount, moveYAmount);
    ctx.restore();
}


//Run the main function
if (pdfjsDefined) main();