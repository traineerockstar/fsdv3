import { GoogleGenAI, SchemaType } from "@google/genai";
import type { ProcessedData } from '../types';

// IMPORTANT: The correct import for Type is from @google/genai.
// We use SchemaType.STRING, SchemaType.ARRAY, etc. if importing SchemaType, 
// OR usually Type.STRING if importing Type.
// Let's stick to the patterns requested in the prompt guidelines.
import { Type } from "@google/genai";

const createMasterPrompt = (): string => {
  return `
### ROLE AND OBJECTIVE ###
You are an expert data processing AI. Your sole objective is to meticulously extract data from a series of provided PNG screenshots of a field service application, process it according to a strict set of rules, and generate a JSON object containing two specific outputs: a formatted data table and a set of customer notification messages. Accuracy, precision, and adherence to the specified format are your highest priorities. You are acting as an assistant to an engineer named Matt.

### CORE LOGIC AND PROCESS ###
You will execute the following operational sequence without deviation:

Step 1: Initial Scan and State Definition
Scan the "Schedule" screenshots first to establish the date of the jobs (e.g., "Wednesday, Nov 12") and the ORIGINAL ORDER of all service appointments. Create an internal list of the jobs in this exact original sequence. This sequence is critical for generating the final customer messages.

Step 2: Iterative Data Extraction and Association
For each job in the original sequence, perform a deep dive:
- Navigate to its corresponding "Work Order" screen. Extract the verbatim "Description of Fault" and "Subject".
- Navigate to its corresponding "Asset" screen. Extract the "Serial Number (Complete)", "Product Code", "Product Brand", and "Product Category".
- Store all extracted data points (address, fault, serial number, etc.) in a structured object associated with that job.

Step 3: Data Transformation and Enrichment
After extracting the raw data for ALL jobs, process the data for each job object:
- Decode Production Year: Based on the "Serial Number" and "Brand", apply the rules from the Knowledge Base to calculate the "Production Year".
- Extract Error Code: Scan the "Description of Fault" and "Subject" fields. If an error code pattern (e.g., "E08", "E15") is found, extract it into a dedicated "Error Code" field. If none is found, this field must be blank.
- Refine Product Type (Corrected Logic):
  - Primary Source: Use the "Product Category" extracted directly from the asset details page (e.g., "Front Loading Washing Machines", "Tumble Dryer") as the definitive Product Type.
  - Fallback Mechanism: Only if the extracted "Product Category" is missing, generic (e.g., "Laundry"), or unclear, should you then apply the "Product Type Decoding" rules from the Knowledge Base as a secondary method to determine a more specific type.

Step 4: Final Output Generation
You will generate a single JSON object with two keys: "dataTable" and "notifications".

1. Generate the Raw Data Table for the "dataTable" key:
   - The first line must be a single title line containing only the Day and Date (e.g., Thursday, Nov 13).
   - Immediately following the title, construct a Markdown table as a single string.
   - The table must have the exact 9-column header: Time | Address | Product Code | Product Type | Product Brand | Description of Fault | Error Code | Production Year | Serial Number.
   - Populate the table with the fully processed and enriched data for each job.
   - **IMPORTANT**: Leave the "Time" column BLANK or put "TBD" for now, as the user will define specific times in the next step.

2. Generate the Customer Notification Messages for the "notifications" key:
   - This should be an array of strings.
   - Reference the original job sequence you defined in Step 1.
   - For each job in that ORIGINAL sequence, generate the message.
   - **CRITICAL**: You do not know the final time yet. You MUST use the exact placeholder "{{TIME_SLOT}}" in the message where the time range would normally go.
   - Message Template: "Good evening, I am Matt, the Hoover/Candy engineer that will be coming to look at your appliance tomorrow. Your correct ETA is as follows: {{TIME_SLOT}}\\n\\nPlease note that this ETA is an estimate. Unforeseen traffic or changes in my daily schedule, such as cancellations, may mean I arrive slightly earlier or later. I will of course contact you if any significant changes to this estimate arise."

### KNOWLEDGE BASE ###
System Identification Logic:
- If the Brand Name is 'Haier', use System B.
- If the first digit of the serial number is '3', use System A.

System A: Data Rules for Hoover / Candy / Associated Brands
- Identifier: Full serial number is a continuous string of digits, beginning with '3'.
- Serial Number Structure: Digits 1-8: Product Code. Digits 9-12: Date of Manufacture Code (YYWW). Digits 13+: Unit Production Number.
- Date of Manufacture: Production Year = (Digits 9-10) + 2000. Production Week = Digits 11-12.
- Product Type Decoding (Fallback Only):
  - Starts with HLE: "Freestanding washing machine"
  - Starts with HDB: "Integrated washing machine"
  - Starts with HDP: "Integrated washer dryer"
  - Starts with HD: "Freestanding tumble dryer"
  - Starts with DXO or DX C: "Tumble Dryer"

System B: Data Rules for Haier Brand
- Identifier: Brand Name is 'Haier'.
- Date of Manufacture (from Serial): A=2010, B=2011, C=2012, D=2013, E=2014, F=2015, G=2016, H=2017.

Special Case: 20-Digit Serial Number Decoding (Haier/Hoover/Candy)
- Trigger: Serial number is exactly 20 digits long. Overrides other date logic.
- Structure: Digit 14 is Year Code (A=2010, B=2011, ..., H=2017).

Invalid Serial Number Flag:
- Trigger: Serial Number is exactly "0000" or ends in "0000".
- Action: The "Serial Number" column should contain the numbers. The Production Year might be indeterminable.
`;
}

const API_KEY = process.env.API_KEY;

const ai = new GoogleGenAI({ apiKey: API_KEY || '' });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    dataTable: {
      type: Type.STRING,
      description: "A single string containing the title and the full Markdown table of processed job data.",
    },
    notifications: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: "A customer notification message string with the {{TIME_SLOT}} placeholder.",
      },
      description: "An array of customer notification messages, ordered according to the original job sequence.",
    },
  },
  required: ['dataTable', 'notifications'],
};

export async function processFieldDataFromImages(
  base64Images: string[]
): Promise<ProcessedData> {
  if (!API_KEY) {
    throw new Error("API_KEY not found in environment variables.");
  }

  const imageParts = base64Images.map(img => ({
    inlineData: {
      mimeType: 'image/png',
      data: img,
    },
  }));
  
  const masterPrompt = createMasterPrompt();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: masterPrompt }, ...imageParts] },
      config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
      },
    });

    const rawJson = response.text;
    if (!rawJson) {
        throw new Error("No text returned from Gemini");
    }
    
    const parsedData = JSON.parse(rawJson);
    if (parsedData.dataTable && Array.isArray(parsedData.notifications)) {
      return parsedData as ProcessedData;
    } else {
      throw new Error("Parsed JSON does not match the expected format.");
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to process images. Please try again.");
  }
}
