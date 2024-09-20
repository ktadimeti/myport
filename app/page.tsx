//import Image from "next/image";
import Upload from "../components/component/upload";

export default function Home() {
    return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <h1 className="text-4xl font-bold mb-8">CAPSTAN</h1>
        <Upload />
        <footer className="flex flex-col items-center justify-center w-full h-24 border-t mt-8">
          {/* You can add any other footer content here if needed */}
        </footer>
      </main>
    );
}