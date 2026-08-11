/**
 * FILE PARSER MODULE
 * Handles extraction of financial data from different file types
 * Supports: PDF, XLS/XLSX, PNG/JPG
 */

const fs = require('fs');
const path = require('path');

// Storage for extracted data
const extractedData = [];

// Parse bank statement PDF (simplified - extracts text)
// Note: For full PDF parsing in production, install 'pdfparse' or 'pdf2json'
async function parseBankStatementPDF(filePath) {
  try {
    // Check if pdfparse is available
    let PDFParser;
    try {
      PDFParser = require('pdf2json');
    } catch (e) {
      // Fallback: return placeholder for demo
      return {
        tipo: 'extrato_bancario',
        banco: 'Desconhecido',
        lançamentos: [],
        aviso: 'PDF parsing requer instalação de dependências. Use OCR ou upload manual.'
      };
    }

    const pdfParser = new PDFParser();

    return new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', err => reject(err));
      pdfParser.on('pdfParser_dataReady', () => {
        const data = pdfParser.getRawTextContent();
        resolve({
          tipo: 'extrato_bancario',
          conteudo_bruto: data,
          paginas: pdfParser.data.Pages.length
        });
      });
      pdfParser.loadPDF(filePath);
    });
  } catch (error) {
    console.error('Erro ao parsear PDF:', error.message);
    return { tipo: 'pdf_erro', mensagem: error.message };
  }
}

// Parse credit card PDF
async function parseCreditCardPDF(filePath) {
  try {
    let PDFParser;
    try {
      PDFParser = require('pdf2json');
    } catch (e) {
      return {
        tipo: 'fatura_cartao',
        aviso: 'Requer dependência: npm install pdf2json'
      };
    }

    const pdfParser = new PDFParser();

    return new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', err => reject(err));
      pdfParser.on('pdfParser_dataReady', () => {
        const data = pdfParser.getRawTextContent();
        resolve({
          tipo: 'fatura_cartao',
          conteudo_bruto: data,
          paginas: pdfParser.data.Pages.length
        });
      });
      pdfParser.loadPDF(filePath);
    });
  } catch (error) {
    return { tipo: 'fatura_cartao_erro', mensagem: error.message };
  }
}

// Parse Excel file (XLS/XLSX)
async function parseExcelFile(filePath) {
  try {
    let XLSX;
    try {
      XLSX = require('xlsx');
    } catch (e) {
      return {
        tipo: 'xlsx',
        aviso: 'Requer dependência: npm install xlsx'
      };
    }

    const workbook = XLSX.readFile(filePath);
    const sheets = {};

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet);
    }

    return {
      tipo: 'planilha_excel',
      planilhas: workbook.SheetNames,
      dados: sheets
    };
  } catch (error) {
    return { tipo: 'xlsx_erro', mensagem: error.message };
  }
}

// Parse image file (PNG/JPG) - requires OCR
async function parseImageOCR(filePath) {
  try {
    // For production, use tesseract.js or cloud-vision API
    // npm install tesseract.js
    let Tesseract;
    try {
      Tesseract = require('tesseract.js');
    } catch (e) {
      return {
        tipo: 'screenshot',
        aviso: 'Requer dependência: npm install tesseract.js',
        arquivo: path.basename(filePath)
      };
    }

    const result = await Tesseract.recognize(filePath, 'por');

    // Extract values starting with R$
    const textoOCR = result.data.text;
    const valoresRegex = /R\$\s*[\d.,]+/g;
    const valores = textoOCR.match(valoresRegex) || [];

    return {
      tipo: 'screenshot_ocr',
      texto_completo: textoOCR,
      valores_identificados: valores,
      confianca: result.data.confidence
    };
  } catch (error) {
    return { tipo: 'imagem_erro', mensagem: error.message };
  }
}

// Main file parser function
async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  console.log(`[PARSER] Analisando arquivo: ${fileName}`);

  let resultado;

  switch (ext) {
    case '.pdf':
      // Try to detect PDF type by name
      if (fileName.toLowerCase().includes('extrato')) {
        resultado = await parseBankStatementPDF(filePath);
      } else if (fileName.toLowerCase().includes('fatura') || fileName.toLowerCase().includes('cartao')) {
        resultado = await parseCreditCardPDF(filePath);
      } else {
        // Default to bank statement
        resultado = await parseBankStatementPDF(filePath);
      }
      break;

    case '.xlsx':
    case '.xls':
      resultado = await parseExcelFile(filePath);
      break;

    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
      resultado = await parseImageOCR(filePath);
      break;

    default:
      resultado = {
        tipo: 'tipo_nao_suportado',
        extensao: ext,
        suportados: ['.pdf', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.gif']
      };
  }

  resultado.arquivo_original = fileName;
  resultado.data_processamento = new Date().toISOString();

  return resultado;
}

// Batch process multiple files
async function parseMultipleFiles(filePaths) {
  const resultados = [];

  for (const filePath of filePaths) {
    try {
      const resultado = await parseFile(filePath);
      resultados.push(resultado);
    } catch (error) {
      resultados.push({
        arquivo: path.basename(filePath),
        erro: error.message,
        tipo: 'erro_parsing'
      });
    }
  }

  return resultados;
}

module.exports = {
  parseFile,
  parseMultipleFiles,
  parseBankStatementPDF,
  parseCreditCardPDF,
  parseExcelFile,
  parseImageOCR
};
