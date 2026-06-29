(function () {
  async function ensurePdfjs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    throw new Error("pdfjsLib not present — inject scripts/pdfjs.min.js first");
  }
  function configureWorker(pdfjsLib) {
    try {
      if (window.__LR_PDF_WORKER) {
        const blob = new Blob([window.__LR_PDF_WORKER], { type: "text/javascript" });
        pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(URL.createObjectURL(blob));
        return;
      }
    } catch (e) { /* CSP blocked blob worker — fall through to main-thread */ }
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";
  }
  window.__LR_pdf = async function (absoluteUrl) {
    try {
      const pdfjsLib = await ensurePdfjs();
      configureWorker(pdfjsLib);
      const buf = await (await fetch(absoluteUrl, { credentials: "include" })).arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((it) => it.str).join(" ") + "\n\n";
      }
      return { text: text.trim(), pages: pdf.numPages };
    } catch (e) { return { error: String(e && e.message || e) }; }
  };
})();
