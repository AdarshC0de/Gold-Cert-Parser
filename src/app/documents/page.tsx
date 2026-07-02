"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Document {
  id: string;
  fileUrl: string;
  manufacturer: string | null;
  certNo: string | null;
  invoiceNo: string | null;
  refDate: string | null;
  createdAt: string;
  user?: {
    email: string;
  };
}

interface UserSession {
  id: string;
  role: "ADMIN" | "USER";
  email: string;
}

export default function DocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const user = session?.user as UserSession | undefined;
  const isAdmin = user?.role === "ADMIN";


  useEffect(() => {

    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }


    if (status === "authenticated" && user) {

      const url = isAdmin
        ? "/api/admin/documents"
        : `/api/documents?userId=${user.id}`;


      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          setDocuments(data.documents ?? []);
        })
        .catch((err) => {
          console.error("Fetch error:", err);
        })
        .finally(() => {
          setLoading(false);
        });

    }

  }, [status, isAdmin, user, router]);



  if (status === "loading" || loading) {
    return (
      <main className="p-6 text-center text-gray-500">
        Loading...
      </main>
    );
  }



  return (

    <main className="max-w-5xl mx-auto p-6 space-y-6">


      {lightbox && (

        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >


          <div
            className="relative max-w-4xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >


            <img
              src={lightbox}
              alt="certificate"
              className="max-w-full max-h-[80vh] object-contain rounded shadow-2xl"
            />



            <div className="flex justify-center gap-3 mt-4">


              {/* DOWNLOAD LOCAL */}
              <button

                onClick={async () => {

                  try {

                    const response = await fetch(lightbox);

                    const blob = await response.blob();


                    const url = window.URL.createObjectURL(blob);


                    const link = document.createElement("a");

                    link.href = url;

                    link.download = "gold-certificate.jpg";


                    document.body.appendChild(link);

                    link.click();


                    link.remove();

                    window.URL.revokeObjectURL(url);


                  }
                  catch (error) {

                    console.error("Download failed:", error);

                    alert("Unable to download certificate");

                  }

                }}


                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 shadow"

              >

                ⬇ Download

              </button>





              {/* SHARE */}

              <button

                onClick={async () => {

                  try {

                    if (navigator.share) {

                      await navigator.share({

                        url: lightbox,

                        title: "Gold Certificate"

                      });

                    }

                    else {

                      await navigator.clipboard.writeText(lightbox);

                      alert("Link copied");

                    }


                  }
                  catch { }

                }}

                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 shadow"

              >

                ↗ Share

              </button>





              {/* PRINT */}

              <button
                onClick={() => {
                  // A separate popup window (window.open + document.write) is
                  // what triggers the desktop app's "you'll need a new app to
                  // open this about:blank link" dialog — the app shell doesn't
                  // reliably own popup windows. Printing via a hidden iframe
                  // in the current window avoids opening any new window at all.
                  const existing = document.getElementById("print-frame");
                  if (existing) existing.remove();

                  const iframe = document.createElement("iframe");
                  iframe.id = "print-frame";
                  iframe.style.position = "fixed";
                  iframe.style.right = "0";
                  iframe.style.bottom = "0";
                  iframe.style.width = "0";
                  iframe.style.height = "0";
                  iframe.style.border = "0";
                  document.body.appendChild(iframe);

                  const doc = iframe.contentWindow?.document;
                  if (!doc) return;

                  doc.open();
                  doc.write(`
                    <html>
                      <head>
                        <title>Print Certificate</title>
                        <style>
                          body { margin:0; display:flex; justify-content:center; align-items:center; }
                          img { max-width:100%; height:auto; }
                        </style>
                      </head>
                      <body>
                        <img src="${lightbox}" id="printImage"/>
                      </body>
                    </html>
                  `);
                  doc.close();

                  const img = doc.getElementById("printImage") as HTMLImageElement | null;
                  const doPrint = () => {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                  };
                  if (img) {
                    if (img.complete) doPrint();
                    else img.onload = doPrint;
                  }
                }}

                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 shadow"
              >

                🖨 Print

              </button>



            </div>


          </div>



          <button

            className="absolute top-4 right-4 text-white text-4xl font-bold"

            onClick={() => setLightbox(null)}

          >

            ✕

          </button>



        </div>

      )}






      <div className="flex justify-between items-center">


        <h1 className="text-2xl font-bold">

          {isAdmin ? "All Uploaded Documents" : "My Documents"}

        </h1>


        <span className="text-sm text-gray-500">

          {documents.length} total

        </span>


      </div>





      {documents.length === 0 && (

        <p className="text-gray-500">

          No documents uploaded yet.

        </p>

      )}







      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">


        {documents.map((doc) => (


          <div

            key={doc.id}

            className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition"

          >



            <div

              className="cursor-pointer"

              onClick={() => setLightbox(doc.fileUrl)}

            >

              <img

                src={doc.fileUrl}

                alt="certificate"

                className="w-full h-48 object-cover hover:opacity-90"

              />

            </div>





            <div className="p-3 text-xs text-gray-600 space-y-1">


              <p>
                <strong>Cert No:</strong> {doc.certNo ?? "—"}
              </p>


              <p>
                <strong>Invoice:</strong> {doc.invoiceNo ?? "—"}
              </p>


              <p>
                <strong>Manufacturer:</strong> {doc.manufacturer ?? "—"}
              </p>


              <p>
                <strong>Date:</strong> {doc.refDate ?? "—"}
              </p>



              {isAdmin && doc.user && (

                <p>

                  <strong>By:</strong> {doc.user.email}

                </p>

              )}




              <p className="text-gray-400">

                {new Date(doc.createdAt).toLocaleDateString()}

              </p>



            </div>


          </div>


        ))}


      </div>



    </main>

  );

}