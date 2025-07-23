import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { ApiError } from '../utils/ApiError.js';

class OCRService {
  constructor() {
    this.supportedFormats = ['.jpg', '.jpeg', '.png', '.pdf', '.tiff', '.bmp'];
  }

  async processDocument(filePath, documentType) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new ApiError(400, 'File not found');
      }

      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (!this.supportedFormats.includes(fileExtension)) {
        throw new ApiError(400, `Unsupported file format: ${fileExtension}`);
      }

      // Preprocess image for better OCR accuracy
      const processedImagePath = await this.preprocessImage(filePath);
      
      // Perform OCR
      const ocrResult = await this.performOCR(processedImagePath);
      
      // Extract specific information based on document type
      const extractedData = await this.extractDocumentData(ocrResult.text, documentType);
      
      // Clean up processed image
      if (processedImagePath !== filePath) {
        fs.unlinkSync(processedImagePath);
      }

      return {
        success: true,
        documentType,
        rawText: ocrResult.text,
        confidence: ocrResult.confidence,
        extractedData,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new ApiError(500, `OCR processing failed: ${error.message}`);
    }
  }

  async preprocessImage(filePath) {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      
      // Skip preprocessing for PDFs
      if (fileExtension === '.pdf') {
        return filePath;
      }

      const processedPath = filePath.replace(fileExtension, `_processed${fileExtension}`);
      
      await sharp(filePath)
        .resize(2000, 2000, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .normalize()
        .sharpen()
        .toFile(processedPath);
      
      return processedPath;
    } catch (error) {
      console.error('Image preprocessing error:', error);
      return filePath; // Return original if preprocessing fails
    }
  }

  async performOCR(imagePath) {
    try {
      const { data } = await Tesseract.recognize(imagePath, 'eng', {
        logger: m => console.log(m),
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
      });

      return {
        text: data.text,
        confidence: data.confidence,
        words: data.words,
        lines: data.lines,
        paragraphs: data.paragraphs,
      };
    } catch (error) {
      throw new ApiError(500, `OCR recognition failed: ${error.message}`);
    }
  }

  async extractDocumentData(text, documentType) {
    const extractedData = {};

    switch (documentType.toLowerCase()) {
      case 'aadhaar':
        extractedData.aadhaarNumber = this.extractAadhaarNumber(text);
        extractedData.name = this.extractName(text);
        extractedData.dob = this.extractDateOfBirth(text);
        extractedData.address = this.extractAddress(text);
        break;

      case 'pan':
        extractedData.panNumber = this.extractPANNumber(text);
        extractedData.name = this.extractName(text);
        extractedData.fatherName = this.extractFatherName(text);
        extractedData.dob = this.extractDateOfBirth(text);
        break;

      case 'passport':
        extractedData.passportNumber = this.extractPassportNumber(text);
        extractedData.name = this.extractName(text);
        extractedData.nationality = this.extractNationality(text);
        extractedData.dob = this.extractDateOfBirth(text);
        extractedData.issueDate = this.extractIssueDate(text);
        extractedData.expiryDate = this.extractExpiryDate(text);
        break;

      case 'voterid':
        extractedData.voterIdNumber = this.extractVoterIdNumber(text);
        extractedData.name = this.extractName(text);
        extractedData.fatherName = this.extractFatherName(text);
        extractedData.dob = this.extractDateOfBirth(text);
        break;

      case 'payslip':
        extractedData.employeeName = this.extractName(text);
        extractedData.employeeId = this.extractEmployeeId(text);
        extractedData.basicSalary = this.extractBasicSalary(text);
        extractedData.grossSalary = this.extractGrossSalary(text);
        extractedData.netSalary = this.extractNetSalary(text);
        extractedData.payPeriod = this.extractPayPeriod(text);
        break;

      case 'bankstatement':
        extractedData.accountNumber = this.extractAccountNumber(text);
        extractedData.accountHolderName = this.extractName(text);
        extractedData.bankName = this.extractBankName(text);
        extractedData.statementPeriod = this.extractStatementPeriod(text);
        extractedData.transactions = this.extractTransactions(text);
        break;

      default:
        extractedData.rawText = text;
        break;
    }

    return extractedData;
  }

  extractAadhaarNumber(text) {
    const aadhaarRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
    const matches = text.match(aadhaarRegex);
    return matches ? matches[0].replace(/\s/g, '') : null;
  }

  extractPANNumber(text) {
    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/g;
    const matches = text.match(panRegex);
    return matches ? matches[0] : null;
  }

  extractPassportNumber(text) {
    const passportRegex = /[A-Z]{1}[0-9]{7}/g;
    const matches = text.match(passportRegex);
    return matches ? matches[0] : null;
  }

  extractVoterIdNumber(text) {
    const voterIdRegex = /[A-Z]{3}[0-9]{7}/g;
    const matches = text.match(voterIdRegex);
    return matches ? matches[0] : null;
  }

  extractName(text) {
    // Look for common name patterns
    const namePatterns = [
      /Name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  extractDateOfBirth(text) {
    const dobPatterns = [
      /(?:DOB|Date of Birth)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g,
    ];

    for (const pattern of dobPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  extractAddress(text) {
    // Extract address (simplified approach)
    const addressPattern = /Address[:\s]+(.*?)(?:\n|$)/i;
    const match = text.match(addressPattern);
    return match ? match[1].trim() : null;
  }

  extractFatherName(text) {
    const fatherNamePattern = /(?:Father|Father's Name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
    const match = text.match(fatherNamePattern);
    return match ? match[1].trim() : null;
  }

  extractNationality(text) {
    const nationalityPattern = /Nationality[:\s]+([A-Z][a-z]+)/i;
    const match = text.match(nationalityPattern);
    return match ? match[1].trim() : null;
  }

  extractIssueDate(text) {
    const issueDatePattern = /(?:Issue Date|Date of Issue)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i;
    const match = text.match(issueDatePattern);
    return match ? match[1] : null;
  }

  extractExpiryDate(text) {
    const expiryDatePattern = /(?:Expiry Date|Date of Expiry)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i;
    const match = text.match(expiryDatePattern);
    return match ? match[1] : null;
  }

  extractEmployeeId(text) {
    const empIdPattern = /(?:Employee ID|Emp ID)[:\s]+([A-Z0-9]+)/i;
    const match = text.match(empIdPattern);
    return match ? match[1] : null;
  }

  extractBasicSalary(text) {
    const basicSalaryPattern = /Basic[:\s]+(?:Rs\.?\s*)?(\d+(?:,\d+)*(?:\.\d{2})?)/i;
    const match = text.match(basicSalaryPattern);
    return match ? parseFloat(match[1].replace(/,/g, '')) : null;
  }

  extractGrossSalary(text) {
    const grossSalaryPattern = /Gross[:\s]+(?:Rs\.?\s*)?(\d+(?:,\d+)*(?:\.\d{2})?)/i;
    const match = text.match(grossSalaryPattern);
    return match ? parseFloat(match[1].replace(/,/g, '')) : null;
  }

  extractNetSalary(text) {
    const netSalaryPattern = /Net[:\s]+(?:Rs\.?\s*)?(\d+(?:,\d+)*(?:\.\d{2})?)/i;
    const match = text.match(netSalaryPattern);
    return match ? parseFloat(match[1].replace(/,/g, '')) : null;
  }

  extractPayPeriod(text) {
    const payPeriodPattern = /(?:Pay Period|Month)[:\s]+([A-Za-z]+\s+\d{4})/i;
    const match = text.match(payPeriodPattern);
    return match ? match[1] : null;
  }

  extractAccountNumber(text) {
    const accountPattern = /(?:Account No|A\/c No)[:\s]+(\d+)/i;
    const match = text.match(accountPattern);
    return match ? match[1] : null;
  }

  extractBankName(text) {
    const bankPattern = /(ICICI Bank|HDFC Bank|State Bank of India|Axis Bank|Kotak Mahindra Bank)/i;
    const match = text.match(bankPattern);
    return match ? match[1] : null;
  }

  extractStatementPeriod(text) {
    const periodPattern = /Statement Period[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s+to\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i;
    const match = text.match(periodPattern);
    return match ? `${match[1]} to ${match[2]}` : null;
  }

  extractTransactions(text) {
    // Simplified transaction extraction
    const transactionPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s+.*?\s+(\d+(?:,\d+)*(?:\.\d{2})?)/g;
    const transactions = [];
    let match;

    while ((match = transactionPattern.exec(text)) !== null) {
      transactions.push({
        date: match[1],
        amount: parseFloat(match[2].replace(/,/g, '')),
      });
    }

    return transactions.length > 0 ? transactions : null;
  }
}

export default OCRService;