"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";


interface SearchResult {

  document: {

    id: string;
    fileUrl: string;
    manufacturer: string | null;
    origin: string | null;
    certNo: string | null;
    refDate: string | null;
    invoiceNo: string | null;

  };


  matchedRow: {

    gram: string;
    count: number;
    serialFrom: number;
    serialTo: number;
    series: string;
    purity: string | null;
    brand: string | null;
    rowOrder: number;

  };

}



interface UserSession {

  id: string;
  role: "ADMIN" | "USER";
  email: string;

}



export default function SearchPage() {


  const { data: session, status } = useSession();

  const router = useRouter();


  const [gram, setGram] = useState("");

  const [serial, setSerial] = useState("");

  const [series, setSeries] = useState("");

  const [results, setResults] = useState<SearchResult[] | null>(null);

  const [loading, setLoading] = useState(false);

  const [lightbox, setLightbox] = useState<string | null>(null);



  if (status === "loading") return null;



  if (status === "unauthenticated") {

    return (

      <main className="max-w-md mx-auto p-6 text-center space-y-3">

        <p>Please log in to search.</p>


        <button

          onClick={() => router.push("/login")}

          className="px-4 py-2 bg-blue-600 text-white rounded"

        >

          Go to Login

        </button>


      </main>

    );

  }



  const user = session?.user as UserSession | undefined;

  const isAdmin = user?.role === "ADMIN";





  async function handleSearch() {


    if (!serial) return;


    setLoading(true);


    try {


      const params = new URLSearchParams({

        serial

      });



      if (gram.trim()) {

        params.set(
          "gram",
          gram.trim().toUpperCase()
        );

      }



      if (series.trim()) {

        params.set(
          "series",
          series.trim().toUpperCase()
        );

      }




      const res = await fetch(
        `/api/search?${params.toString()}`
      );


      const data = await res.json();


      setResults(data.results ?? []);



    }

    catch(error){

      console.error("Search error:",error);

      setResults([]);


    }

    finally{

      setLoading(false);

    }


  }





  async function downloadFile(url:string){


    try{


      const response = await fetch(url);


      const blob = await response.blob();



      const localUrl = window.URL.createObjectURL(blob);



      const link = document.createElement("a");


      link.href = localUrl;


      link.download = "gold-certificate.jpg";



      document.body.appendChild(link);



      link.click();



      link.remove();



      window.URL.revokeObjectURL(localUrl);



    }


    catch(error){


      console.error("Download failed:",error);


      alert("Unable to download certificate");


    }


  }





  return (


    <main className="max-w-3xl mx-auto p-6 space-y-6">





      {lightbox && (


        <div

          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"

          onClick={()=>setLightbox(null)}

        >



          <img

            src={lightbox}

            alt="certificate"

            className="max-w-full max-h-full object-contain rounded shadow-2xl"

            onClick={(e)=>e.stopPropagation()}

          />



          <button

            className="absolute top-4 right-4 text-white text-4xl font-bold"

            onClick={()=>setLightbox(null)}

          >

            ✕

          </button>



        </div>


      )}






      <h1 className="text-2xl font-bold">

        Search Certificate

      </h1>





      <p className="text-sm text-gray-500">


        {isAdmin

          ? "Admin: searching across all users' documents."

          : "Searching your uploaded documents only."

        }


      </p>







      <div className="flex gap-3 items-end flex-wrap">





        <label className="flex flex-col text-sm">


          Gram


          <input

            className="border rounded p-2 mt-1 w-36"

            placeholder="e.g. 10, ONZ, 1KG"

            value={gram}

            onChange={(e)=>setGram(e.target.value)}

            onKeyDown={(e)=>e.key==="Enter" && handleSearch()}

          />


        </label>







        <label className="flex flex-col text-sm">


          Serial Number


          <input

            className="border rounded p-2 mt-1 w-40"

            placeholder="e.g. 728601"

            value={serial}

            onChange={(e)=>setSerial(e.target.value)}

            onKeyDown={(e)=>e.key==="Enter" && handleSearch()}

          />


        </label>







        <label className="flex flex-col text-sm">


          Series


          <input

            className="border rounded p-2 mt-1 w-24"

            placeholder="AA or AC"

            value={series}

            onChange={(e)=>setSeries(e.target.value)}

            onKeyDown={(e)=>e.key==="Enter" && handleSearch()}

          />


        </label>






        <button

          onClick={handleSearch}

          disabled={loading || !serial}

          className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"

        >

          {loading ? "Searching..." : "Search"}

        </button>



      </div>






      <p className="text-xs text-gray-400">

        Gram and Series are optional — but providing them narrows results.
        Serial number is required.

      </p>







      {results !== null && (


        <section className="space-y-4">



          {results.length===0 && (


            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">


              No matching certificate found.


            </div>


          )}







          {results.map((r,i)=>(



            <div

              key={i}

              className="border rounded-xl p-4 flex gap-4 shadow-sm"

            >




              <div className="flex-shrink-0">





                <img

                  src={r.document.fileUrl}

                  alt="certificate"

                  className="w-36 h-48 object-cover border rounded cursor-pointer hover:opacity-80 transition"

                  onClick={()=>setLightbox(r.document.fileUrl)}

                />





                <p className="text-xs text-center text-gray-400 mt-1">

                  Click to enlarge

                </p>







                <button

                  onClick={()=>downloadFile(r.document.fileUrl)}

                  className="block w-full text-center text-xs mt-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border"

                >

                  ⬇ Download

                </button>




              </div>









              <div className="text-sm space-y-1 flex-1">



                <p className="font-semibold text-base text-green-700">

                  ✓ Certificate Found

                </p>


                <hr />


                <p>
                  <strong>Manufacturer:</strong> {r.document.manufacturer ?? "—"}
                </p>


                <p>
                  <strong>Cert No:</strong> {r.document.certNo ?? "—"}
                </p>


                <p>
                  <strong>Invoice No:</strong> {r.document.invoiceNo ?? "—"}
                </p>


                <p>
                  <strong>Date:</strong> {r.document.refDate ?? "—"}
                </p>



                <hr />



                <p className="font-medium">

                  Matched Row:

                </p>


                <p>
                  <strong>Gram:</strong> {r.matchedRow.gram}
                </p>


                <p>
                  <strong>Range:</strong> {r.matchedRow.serialFrom} – {r.matchedRow.serialTo}
                </p>


                <p>
                  <strong>Series:</strong> {r.matchedRow.series}
                </p>


                <p>
                  <strong>Purity:</strong> {r.matchedRow.purity ?? "—"}
                </p>


                <p>
                  <strong>Brand:</strong> {r.matchedRow.brand ?? "—"}
                </p>



              </div>



            </div>



          ))}



        </section>


      )}



    </main>


  );


}