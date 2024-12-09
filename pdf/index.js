 
const input = document.getElementById("pdfinput");
const pdfFrame = document.getElementById("pdfFrame");
const rangeselector = document.getElementById("rangeselector");
const tiquselector = document.getElementById("tiquselector");
const extractBtn = document.getElementById("extractBtn");
const tiquBtn = document.getElementById("tiquBtn");
const textarea = document.getElementById("textarea")
let files = null
let pdfDocumentInstance = null
// textarea.innerText = JSON.stringify({a:{b:{c:'hello world!',d:0.05954544545234311}}})
const useType = {
  'pdf-lib': true,
  'pdf-js': true
}

let pdfArrayBuffer;

// Read our file in async/await fashion
function readAsyncFile(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Reander the pdf in an Iframe
async function renderPdf(arrayBuff) {
  const tempblob = new Blob([new Uint8Array(arrayBuff)], {
    type: "application/pdf",
  });
  const docUrl = URL.createObjectURL(tempblob);
  pdfFrame.src = docUrl;
  // const strBlob = await tempblob.text();
  // const stream = await tempblob.stream();
  // const arr = new DataView(await tempblob.arrayBuffer());
  // const decoder = new TextDecoder();
  // const str = decoder.decode(arrayBuff);
  // console.log(str)
}

// Select page range
function range(start, end) {
  let length = end - start + 1;
  return Array.from({ length }, (_, i) => start + i - 1);
}

// Get the files from filepicker
input.addEventListener("change", async (e) => {
  files = e.target.files;
  if (files.length > 0 && useType['pdf-js']) {
    // 使用pdf.js 库完美解决改问题
    pdfJSMode(files[0])
  }

  // pdf edit viewer
  if (files.length > 0 && useType['pdf-lib']) {
    pdfArrayBuffer = await readAsyncFile(files[0]);
    renderPdf(pdfArrayBuffer);
  }
});

// 使用pdf.js 库完美解决
function pdfJSMode(file) {
  if (!file) return;

  const fileReader = new FileReader();
  fileReader.onload = async function () {
    const pdfData = new Uint8Array(this.result);

    const pdfjsLib = window["pdfjs-dist/build/pdf"];
    pdfDocumentInstance = await pdfjsLib.getDocument({ data: pdfData }).promise;
    let fullText = "";
    for (let i = 1; i <= pdfDocumentInstance.numPages; i++) {
        const page = await pdfDocumentInstance.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join("\n");
        fullText += pageText + "\n";
    }

    console.log("Extracted Text:", fullText);
  };

  fileReader.readAsArrayBuffer(file);
} 

// Start extraction
extractBtn.addEventListener("click", async () => {
  const rawRange = rangeselector.value;
  const rangelist = rawRange.split("-");
  const pdfSrcDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer);

  const pdfNewDoc = await PDFLib.PDFDocument.create();

  const pages = await pdfNewDoc.copyPages(
    pdfSrcDoc,
    range(Number(rangelist[0]), Number(rangelist[1]))
  );

  const helveticaFont = await pdfSrcDoc.embedFont(PDFLib.StandardFonts.Helvetica)

  pages.forEach((page) => {
    setSignalPage(page, helveticaFont)
    pdfNewDoc.addPage(page)
  } );
  const newpdf = await pdfNewDoc.save();
  saveAs(new Blob([newpdf], { type: "application/pdf" }), `extracted.pdf`);
});


tiquBtn.addEventListener("click", async () => {
  const rawRange = tiquselector.value;
  const rangelist = rawRange.split("-");
  let txt = await getText(rangelist[0],rangelist[1]?rangelist[1]:null)
  textarea.innerText = txt
  console.log(`提取的内容是：\n ${txt}`)
});

async function getText(start, end) {
  const pdfDocument = pdfDocumentInstance

  let splitText = ''
  let openSplitText = false
  for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      if (start || end) {
        // 每页发起检查
        for (item of textContent.items) {
          if (openSplitText) {
            // 通道打开 累加
            item.str.includes(end) ? openSplitText = false : 
            splitText += item.str + "\n";
          } else {
            if (item.str.includes(start)) {
              splitText += item.str + "\n"
              openSplitText = true
            }
          }
        }
      }
  }

  return splitText
}

async function setSignalPage(page, helveticaFont) {
  const { width, height } = page.getSize()
  page.drawText('This text was added with JavaScript!', {
    x: 5,
    y: height / 2 + 300,
    size: 50,
    font: helveticaFont,
    color: PDFLib.rgb(0.95, 0.1, 0.1),
    rotate: PDFLib.degrees(-45),
  })
}
