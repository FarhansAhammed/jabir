import "./globals.css";

export const metadata = {
  title: "3D Physics Jabir Balls Diffusion",
  description: "A gorgeous, interactive 3D physics-enabled grid of custom textured spheres reacting dynamically to cursor movements and producing audio feedback.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
