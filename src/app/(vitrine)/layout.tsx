import Navbar from "@/components/vitrine/Navbar";
import Footer from "@/components/vitrine/Footer";

export default function VitrineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
