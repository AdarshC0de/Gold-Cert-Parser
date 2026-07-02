"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";


interface Document {

  id: string;
  fileUrl: string;
  manufacturer: string | null;
  certNo: string | null;
  invoiceNo: string | null;
  refDate: string | null;
  verified: boolean;
  createdAt: string;

  user?: {
    email:string;
  };


  rows:{
    id:string;
    gram:string;
    count:number;
    serialFrom:number;
    serialTo:number;
    series:string;
    purity:string|null;
    brand:string|null;
    rowOrder:number;
  }[];

}



interface UserSession {

  role:"ADMIN"|"USER";
  email:string;

}



export default function AdminDocumentsPage(){


  const {data:session,status}=useSession();

  const router=useRouter();



  const [documents,setDocuments]=useState<Document[]>([]);

  const [loading,setLoading]=useState(true);

  const [lightbox,setLightbox]=useState<string|null>(null);

  const [tableModal,setTableModal]=useState<Document|null>(null);



  const user=session?.user as UserSession | undefined;

  const isAdmin=user?.role==="ADMIN";





  useEffect(()=>{


    if(status==="unauthenticated"){

      router.push("/login");

      return;

    }



    if(status==="authenticated"){



      if(!isAdmin){

        router.push("/");

        return;

      }




      fetch("/api/admin/documents")

        .then(res=>res.json())

        .then(data=>{

          setDocuments(data.documents ?? []);

        })

        .catch(err=>{

          console.error(err);

        })

        .finally(()=>{

          setLoading(false);

        });



    }



  },[status,isAdmin,router]);







  async function downloadFile(url:string){


    try{


      const response=await fetch(url);


      const blob=await response.blob();



      const localUrl=window.URL.createObjectURL(blob);



      const link=document.createElement("a");


      link.href=localUrl;


      link.download="gold-certificate.jpg";



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







  if(status==="loading" || loading){

    return (

      <main className="p-6 text-center text-gray-500">

        Loading...

      </main>

    );

  }







  return (

    <main className="w-full px-6 py-6 space-y-6">





      {/* IMAGE LIGHTBOX */}

      {lightbox && (


        <div

          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"

          onClick={()=>setLightbox(null)}

        >



          <div className="flex flex-col items-center gap-4">


            <img

              src={lightbox}

              alt="certificate"

              className="max-w-full max-h-[80vh] object-contain rounded shadow-2xl"

              onClick={(e)=>e.stopPropagation()}

            />



            <button

              onClick={()=>downloadFile(lightbox)}

              className="px-5 py-2 bg-white text-gray-800 rounded-lg shadow hover:bg-gray-100"

            >

              ⬇ Download

            </button>



          </div>





          <button

            className="absolute top-4 right-4 text-white text-4xl font-bold"

            onClick={()=>setLightbox(null)}

          >

            ✕

          </button>




        </div>


      )}








      {/* TABLE MODAL */}

      {tableModal && (


        <div

          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"

          onClick={()=>setTableModal(null)}

        >



          <div

            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"

            onClick={(e)=>e.stopPropagation()}

          >




            <div className="flex items-center justify-between p-4 border-b bg-gray-50">


              <div>

                <h3 className="font-semibold text-lg">

                  Cert No: {tableModal.certNo ?? "—"}

                </h3>


                <p className="text-sm text-gray-500">

                  {tableModal.manufacturer} · {tableModal.refDate} · {tableModal.user?.email}

                </p>


              </div>





              <div className="flex gap-2">


                <Link

                  href={`/admin/documents/${tableModal.id}`}

                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"

                >

                  Edit Document

                </Link>



                <button

                  onClick={()=>setTableModal(null)}

                  className="px-3 py-2 border rounded-lg text-sm"

                >

                  ✕ Close

                </button>



              </div>



            </div>







            <div className="overflow-auto p-4 flex-1">


              <table className="w-full text-sm border">


                <thead>

                  <tr className="bg-gray-100 sticky top-0">

                    <th className="border p-2">#</th>
                    <th className="border p-2">Gram</th>
                    <th className="border p-2">Count</th>
                    <th className="border p-2">From</th>
                    <th className="border p-2">To</th>
                    <th className="border p-2">Series</th>
                    <th className="border p-2">Purity</th>
                    <th className="border p-2">Brand</th>

                  </tr>

                </thead>



                <tbody>


                {tableModal.rows

                  .sort((a,b)=>a.rowOrder-b.rowOrder)

                  .map(row=>(


                    <tr key={row.id}>


                      <td className="border p-2">{row.rowOrder}</td>

                      <td className="border p-2">{row.gram}</td>

                      <td className="border p-2">{row.count}</td>

                      <td className="border p-2">{row.serialFrom}</td>

                      <td className="border p-2">{row.serialTo}</td>

                      <td className="border p-2">{row.series}</td>

                      <td className="border p-2">{row.purity}</td>

                      <td className="border p-2">{row.brand}</td>


                    </tr>


                  ))}



                </tbody>


              </table>



            </div>



          </div>



        </div>


      )}









      <div className="flex justify-between items-center">


        <h1 className="text-2xl font-bold">

          All Uploaded Documents

        </h1>



        <span className="text-sm text-gray-500">

          {documents.length} total

        </span>


      </div>








      {documents.length===0 && (

        <p className="text-gray-500">

          No documents uploaded yet.

        </p>

      )}







      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">



        {documents.map(doc=>(


          <div

            key={doc.id}

            className="border rounded-xl overflow-hidden shadow-sm"

          >



            <img

              src={doc.fileUrl}

              alt="certificate"

              className="w-full h-48 object-cover cursor-pointer"

              onClick={()=>setLightbox(doc.fileUrl)}

            />





            <div className="p-3 text-xs space-y-1 text-gray-600">


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


              <p>
                <strong>By:</strong> {doc.user?.email ?? "—"}
              </p>



              <div className="flex gap-2 pt-2">


                <button

                  onClick={()=>setTableModal(doc)}

                  className="flex-1 border rounded px-2 py-1"

                >

                  Table

                </button>




                <Link

                  href={`/admin/documents/${doc.id}`}

                  className="flex-1 border rounded px-2 py-1 text-center"

                >

                  Edit

                </Link>


              </div>


            </div>



          </div>



        ))}



      </div>



    </main>

  );


}