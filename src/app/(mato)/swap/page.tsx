import MatoFeature from "@/components/mato/mato-feature";

export default function Page() {
  console.log("Page, RPC_URL", process.env.RPC_KEY);
  return <MatoFeature />;
}
