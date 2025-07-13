import mongoose,{Schema} from "mongoose";

const applicationSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        serviceType: {
            type: String,
            enum: ["credit_card","loan","account"],
            required: true
        },
        applicationNumber: {
            type: String,
            required: true,
            unique: true
        },
        documents:[{
            type: String,
            required: true
        }],
        status: {
            type: String,
            enum: ["Approved","Rejected","Pending"],
            default: "Pending"
        },
        validationSummary: [
            {
                file: String,
                status: String
            }
        ]
    },
    {
        timestamps: true
    }
)

export const Application = mongoose.model("Apllication",applicationSchema);