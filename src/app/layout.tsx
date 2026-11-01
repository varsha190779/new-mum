import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Optimum Network Observatory — see how mump2p + RLNC moves data",
  description:
    "An interactive, simulated visual explainer of how mump2p and Random Linear Network Coding (RLNC) propagate data across a peer-to-peer network, compared with traditional forwarding.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F6F6F3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
