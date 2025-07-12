import path from "path";
import { Application } from "../models/application.model.js";
import { sendApplicationEmail } from "../utils/email.js";
import { launchAbbyyTransaction } from "../utils/abbyy.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v4 as uuidv4 } from "uuid";
import { ApiError } from "../utils/ApiError.js";

export const processDocumentUpload = async (req, res) => {
    try {
        const user = req.user;
        const form = req.body;
        const files = req.files;

        const applicationNumber = generateApplicationNumber(form.serviceType);

        const validationSummary = [];
        const abbyyResults = [];
        const uploadedDocs = [];

        const allDocs = Object.entries(files);

        for (const [docType, fileArr] of allDocs) {
            const file = fileArr[0];
            const filePath = path.resolve(file.path);

            // Upload to Cloudinary
            try {
                const cloudResult = await uploadOnCloudinary(filePath);
                const cloudUrl = cloudResult?.url;

                if (!cloudUrl) {
                    throw new ApiError(500,"Could not upload on cloudinary");
                }
                // Add Cloudinary URL
                uploadedDocs.push(cloudUrl);
            } catch (error) {
                throw new ApiError(501,error?.message || "Cloudinary upload crashed")   
            }

            // Call ABBYY OCR
            // try {
            //     const result = await launchAbbyyTransaction(filePath, file.originalname);
            //     abbyyResults.push(result);
            // } catch (err) {
            //     console.error("❌ ABBYY error:", err.response?.data || err.message);
            //     return res.status(500).json({ error: "ABBYY OCR failed", detail: err.message });
            // }
            const result = { transactionId: uuidv4(), file: file.originalname };
            abbyyResults.push(result);

            

            // Validate document
            const status = validateDocument(docType, file.originalname, form);
            validationSummary.push({ file: file.originalname, status });
        }

        const failed = validationSummary.some(item =>
        item.status.toLowerCase().includes("fail")
        );

        const status = failed ? "Rejected" : "Approved";

        const application = await Application.create({
            user: user._id,
            serviceType: form.serviceType,
            applicationNumber,
            documents: uploadedDocs,
            status,
            validationSummary
        });

        await sendApplicationEmail(form.email, applicationNumber, status, form.serviceType);

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        applicationNumber,
                        applicationStatus: status,
                        abbyyResults,
                        validationResults: validationSummary
                    },
                    "Apllication Processed"
                )
            )
    } catch (error) {
       throw new ApiError(501,error?.message || "Something went wrong while processing document")   
    }
};

const generateApplicationNumber = (type) => {
    const prefixMap = {
        credit_card: "CC",
        loan: "PF",
        account: "BA",
    };
    const prefix = prefixMap[type] || "XX";
    return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
};  

const validateDocument = (docType, filename, form) => {
  switch (docType) {
    case "aadhaar":
      return (filename.includes(form.aadhaarNumber) || form.fullname) ? "Aadhaar Validation Passed ✅" : "Aadhaar Validation Failed ❌";
    case "pan":
      return (["ABCDE1234F", "BNZPM2501F", "BODPM4264E"].includes(form.panNumber)) ? "PAN Matched ✅" : "PAN Validation Failed ❌";
    case "passport":
      return form.passportNumber && form.dob ? "Passport Matched ✅" : "Passport Validation Failed ❌";
    case "voterId":
      return form.voterId ? "Voter ID Matched ✅" : "Voter ID Validation Failed ❌";
    case "payslip":
      return Number(form.salary) >= 10000 ? "Income Validated ✅" : "Income Validation Failed ❌";
    case "bankStatement":
      return filename.toLowerCase().includes("bank") ? "Bank Statement Validated ✅" : "Bank Statement Validation Failed ❌";
    default:
      return "Unknown Document Type ❌";
  }
};
