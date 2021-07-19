# PDF reader

A simple app for listing and reading PDFs.

<img width="342" alt="Screen Shot 2021-07-16 at 15 27 35" src="https://user-images.githubusercontent.com/77331409/125902385-0cca44d4-034c-4f5b-b61c-29fa64b6ab25.png">

## Installation and usage
To install the program, use the following commands:
```
npm install -g monaca
git clone https://github.com/AnniLotta/PDF-reader.git
cd PDF-reader
npm install
```
To run the program, use:
```
monaca preview
```

All the shown PDF files are in the ```sampleFiles```-folder. To add a new file, add it first to the folder and then write the name of the new file to the file list in `pdf-reader.js`:

`files = ['samplePDF1.pdf', 'samplePDF2.pdf', 'samplePDF3.pdf', 'samplePDF4.pdf', 'samplefile_with_a_long_filename.pdf'];`

## pdf.js

The application uses [PDF.js](https://github.com/mozilla/pdf.js) to show PDF files. PDF.js is a library that loads PDF-documents and renders them on an HTML canvas. 
In PDF reader application, pdf.js is used to create a thumbnail for every PDF-file and to show the file when the thumbnail is clicked.
More examples of using PDF.js [here](https://mozilla.github.io/pdf.js/examples/).
