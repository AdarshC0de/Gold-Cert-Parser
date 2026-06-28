import { NextResponse } from "next/server";

const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Gold Certificate Parser API",
    version: "1.0.0",
    description: "API for uploading, parsing, and searching Kuwait Ministry of Commerce gold certificates.",
  },
  servers: [
    { url: "https://gold-cert-parser.vercel.app", description: "Production" },
    { url: "http://localhost:3000", description: "Local Development" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "Session cookie from NextAuth login",
      },
    },
    schemas: {
      ParsedRow: {
        type: "object",
        properties: {
          rowOrder: { type: "integer", example: 1 },
          gram: { type: "string", example: "10GRAMS" },
          gramValue: { type: "number", nullable: true, example: 10 },
          count: { type: "integer", example: 300 },
          serialFrom: { type: "integer", example: 728501 },
          serialTo: { type: "integer", example: 728800 },
          series: { type: "string", example: "AA" },
          purity: { type: "string", example: "999.9" },
          brand: { type: "string", example: "VALCAMBI" },
        },
      },
      Document: {
        type: "object",
        properties: {
          id: { type: "string", example: "clxyz123" },
          fileUrl: { type: "string", example: "https://res.cloudinary.com/..." },
          manufacturer: { type: "string", nullable: true, example: "VALCAMBI" },
          origin: { type: "string", nullable: true, example: "Switzerland" },
          invoiceNo: { type: "string", nullable: true, example: "STX KWI 978B" },
          certNo: { type: "string", nullable: true, example: "24634407" },
          refDate: { type: "string", nullable: true, example: "03/04/2025" },
          verified: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          rows: { type: "array", items: { "$ref": "#/components/schemas/ParsedRow" } },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string", example: "company@example.com" },
          name: { type: "string", nullable: true },
          companyName: { type: "string", nullable: true },
          isActive: { type: "boolean" },
          maxDevices: { type: "integer", example: 2 },
          role: { type: "string", enum: ["ADMIN", "USER"] },
        },
      },
      ProcessingJob: {
        type: "object",
        properties: {
          id: { type: "string" },
          fileName: { type: "string" },
          status: { type: "string", enum: ["PENDING", "PROCESSING", "DONE", "FAILED"] },
          fileUrl: { type: "string" },
          error: { type: "string", nullable: true },
          documentId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Unauthorized" },
        },
      },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    "/api/auth/signin": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        description: "Login with email and password. Returns a session cookie. Pass `fingerprint` (device identifier string) to track device sessions.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "admin@gmail.com" },
                  password: { type: "string", example: "admin123" },
                  fingerprint: { type: "string", example: "abc123xyz", description: "Unique device identifier. Generate from device info to track per-device sessions." },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful, session cookie set" },
          401: { description: "Invalid credentials" },
          403: {
            description: "Account inactive or device limit reached",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", enum: ["ACCOUNT_INACTIVE", "DEVICE_LIMIT_REACHED"] },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Change Password",
        description: "Must be called on first login when mustChangePassword is true.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "currentPassword", "newPassword"],
                properties: {
                  userId: { type: "string" },
                  currentPassword: { type: "string" },
                  newPassword: { type: "string", minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Password changed successfully" },
          400: { description: "Current password incorrect" },
        },
      },
    },
    "/api/upload": {
      post: {
        tags: ["Documents"],
        summary: "Upload certificate image",
        description: "Upload a single certificate image. Returns OCR-extracted rows and header for review. Does NOT save to DB — call POST /api/documents to save.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary", description: "JPG or PNG image" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OCR extracted data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    fileUrl: { type: "string", example: "https://res.cloudinary.com/..." },
                    header: {
                      type: "object",
                      properties: {
                        manufacturer: { type: "string", nullable: true },
                        origin: { type: "string", nullable: true },
                        invoiceNo: { type: "string", nullable: true },
                        certNo: { type: "string", nullable: true },
                        refDate: { type: "string", nullable: true },
                      },
                    },
                    rows: { type: "array", items: { "$ref": "#/components/schemas/ParsedRow" } },
                  },
                },
              },
            },
          },
          500: { description: "OCR or upload failed" },
        },
      },
    },
    "/api/upload-pdf": {
      post: {
        tags: ["Documents"],
        summary: "Upload PDF with multiple certificates",
        description: "Converts each PDF page to an image, uploads to Cloudinary, and queues each for OCR processing. Processing happens automatically in background.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary", description: "PDF file" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "PDF pages queued",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    pagesFound: { type: "integer", example: 10 },
                    jobsCreated: { type: "integer", example: 10 },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/documents": {
      post: {
        tags: ["Documents"],
        summary: "Save a document",
        description: "Save a document and its extracted rows to the database after review.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "fileUrl", "rows"],
                properties: {
                  userId: { type: "string" },
                  fileUrl: { type: "string" },
                  header: {
                    type: "object",
                    properties: {
                      manufacturer: { type: "string", nullable: true },
                      origin: { type: "string", nullable: true },
                      invoiceNo: { type: "string", nullable: true },
                      certNo: { type: "string", nullable: true },
                      refDate: { type: "string", nullable: true },
                    },
                  },
                  rows: { type: "array", items: { "$ref": "#/components/schemas/ParsedRow" } },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Document saved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    document: { "$ref": "#/components/schemas/Document" },
                  },
                },
              },
            },
          },
        },
      },
      get: {
        tags: ["Documents"],
        summary: "List documents",
        description: "Get documents for a user. Pass userId as query param.",
        parameters: [
          { name: "userId", in: "query", schema: { type: "string" }, description: "Filter by user ID" },
        ],
        responses: {
          200: {
            description: "List of documents",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    documents: { type: "array", items: { "$ref": "#/components/schemas/Document" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/search": {
      get: {
        tags: ["Search"],
        summary: "Search certificate by serial number",
        description: "Find which certificate a gold bar belongs to. Regular users search only their own documents. Admins search all.",
        parameters: [
          { name: "serial", in: "query", required: true, schema: { type: "integer" }, example: 728601, description: "Serial number of the gold bar" },
          { name: "series", in: "query", required: false, schema: { type: "string", enum: ["AA", "AC"] }, description: "Series (optional but narrows results)" },
          { name: "gram", in: "query", required: false, schema: { type: "string" }, example: "10GRAMS", description: "Gram label (optional). Can type '10', 'onz', '1kg' etc." },
        ],
        responses: {
          200: {
            description: "Matching certificates",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          document: { "$ref": "#/components/schemas/Document" },
                          matchedRow: { "$ref": "#/components/schemas/ParsedRow" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/queue": {
      get: {
        tags: ["Queue"],
        summary: "Get queue status",
        description: "Returns counts of PENDING/PROCESSING/DONE/FAILED jobs and list of recent 50 jobs.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    counts: {
                      type: "object",
                      properties: {
                        pending: { type: "integer" },
                        processing: { type: "integer" },
                        done: { type: "integer" },
                        failed: { type: "integer" },
                        total: { type: "integer" },
                      },
                    },
                    isRunning: { type: "boolean" },
                    jobs: { type: "array", items: { "$ref": "#/components/schemas/ProcessingJob" } },
                  },
                },
              },
            },
            description: "Queue status",
          },
        },
      },
      post: {
        tags: ["Queue"],
        summary: "Start queue (Admin only)",
        description: "Manually trigger the processing queue. Admin only.",
        responses: {
          200: { description: "Queue started" },
          403: { description: "Forbidden — admin only" },
        },
      },
    },
    "/api/admin/companies": {
      get: {
        tags: ["Admin — Companies"],
        summary: "List all companies (Admin only)",
        responses: {
          200: {
            description: "List of companies",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    companies: { type: "array", items: { "$ref": "#/components/schemas/User" } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Admin — Companies"],
        summary: "Register a new company (Admin only)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "tempPassword"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  companyName: { type: "string" },
                  tempPassword: { type: "string" },
                  maxDevices: { type: "integer", default: 2 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Company created" },
          409: { description: "Email already registered" },
        },
      },
    },
    "/api/admin/companies/{id}": {
      get: {
        tags: ["Admin — Companies"],
        summary: "Get company details with documents and sessions (Admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Company detail" } },
      },
      put: {
        tags: ["Admin — Companies"],
        summary: "Update company (Admin only)",
        description: "Update name, status, max devices, or reset password.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  companyName: { type: "string" },
                  isActive: { type: "boolean" },
                  maxDevices: { type: "integer" },
                  resetPassword: { type: "boolean" },
                  newPassword: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Company updated" } },
      },
      delete: {
        tags: ["Admin — Companies"],
        summary: "Delete company (Admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Company deleted" } },
      },
    },
    "/api/admin/companies/{id}/documents": {
      post: {
        tags: ["Admin — Companies"],
        summary: "Copy document to another company (Admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["documentId", "targetUserId"],
                properties: {
                  documentId: { type: "string" },
                  targetUserId: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Document copied" } },
      },
      delete: {
        tags: ["Admin — Companies"],
        summary: "Delete a document (Admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["documentId"],
                properties: { documentId: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Document deleted" } },
      },
    },
    "/api/admin/documents": {
      get: {
        tags: ["Admin — Documents"],
        summary: "Get all documents across all users (Admin only)",
        responses: {
          200: {
            description: "All documents",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    documents: { type: "array", items: { "$ref": "#/components/schemas/Document" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/admin/documents/{id}": {
      get: {
        tags: ["Admin — Documents"],
        summary: "Get single document with rows (Admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Document detail" } },
      },
      put: {
        tags: ["Admin — Documents"],
        summary: "Update document header and rows (Admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  header: {
                    type: "object",
                    properties: {
                      manufacturer: { type: "string" },
                      origin: { type: "string" },
                      invoiceNo: { type: "string" },
                      certNo: { type: "string" },
                      refDate: { type: "string" },
                    },
                  },
                  rows: { type: "array", items: { "$ref": "#/components/schemas/ParsedRow" } },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Document updated" } },
      },
    },
    "/api/admin/sessions/{id}": {
      delete: {
        tags: ["Admin — Companies"],
        summary: "Kill a user session (Admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Session killed" } },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(swaggerSpec);
}
