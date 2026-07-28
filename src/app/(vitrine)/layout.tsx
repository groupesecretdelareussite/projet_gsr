import { Lexend } from "next/font/google";
import Navbar from "@/components/vitrine/Navbar";
import Footer from "@/components/vitrine/Footer";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

export default function VitrineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${lexend.variable} font-lexend flex flex-col min-h-screen bg-background`}>
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
