//E:\kp\portfolio\src\app\news\page.tsx
import { getAllPosts } from "@/lib/queries";
import Berita from "@/components/News";
import { Metadata } from "next";
import Intro from "@/components/News/atas";

export const revalidate = 60;

// Tambahkan metadata untuk halaman berita
export const metadata: Metadata = {
  title: "Berita - PT. Fortuna Sada Nioga",
  description: "Informasi terbaru seputar pengurusan dokumen Tenaga Kerja Asing dan perizinan investasi di Indonesia.",
  keywords: "berita imigrasi, berita visa kerja, informasi TKA Indonesia, dokumen perizinan",
  openGraph: {
    title: "Berita - PT. Fortuna Sada Nioga",
    description: "Informasi terbaru seputar pengurusan dokumen Tenaga Kerja Asing dan perizinan investasi di Indonesia.",
    url: "https://fortunasadanioga.com/news",
    type: "website",
  }
};

export default async function BlogPage() {
  const posts = await getAllPosts();
 
  return (
    <div className="pt-[70px]">
      <section className="py-20 lg:py-28">
        <div className="container mx-auto mb-10 px-4">
          <Intro/>
          <Berita posts={posts} />
        </div>
      </section>
    </div>
  );
}