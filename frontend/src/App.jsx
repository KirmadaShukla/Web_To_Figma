import { useState } from "react";
import axios from "axios";
import { FaLink } from "react-icons/fa";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleConvert = async () => {
    if (!url) {
      setError("Please enter a valid URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await axios.post("http://localhost:3000/convert", { url });
      setResponse(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-700 mb-4 text-center">Web to Figma Converter</h1>

        <div className="flex items-center border rounded-lg p-2 shadow-sm">
          <FaLink className="text-gray-400 mx-2" />
          <input
            type="text"
            placeholder="Enter website URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-2 outline-none"
          />
        </div>

        <button
          onClick={handleConvert}
          className="w-full bg-blue-500 text-white py-2 mt-4 rounded-lg hover:bg-blue-600 transition"
          disabled={loading}
        >
          {loading ? <AiOutlineLoading3Quarters className="animate-spin mx-auto" /> : "Convert & Upload"}
        </button>

        {error && <p className="text-red-500 mt-4 text-sm text-center">{error}</p>}

        {response && (
          <div className="mt-6 bg-green-100 p-4 rounded-md">
            <p className="text-green-700 font-semibold">Upload Successful! 🎉</p>
            <a
              href={response.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              View on Figma
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
