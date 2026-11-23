import Link from "next/link";

const FooterTextSection = () => {
  return (
    <div>
      <div className="text-center mt-2">
        <p className="text-muted-foreground text-[11px] leading-relaxed max-w-70 mx-auto">
          You acknowledge that you read, and agree, to
          <br />
          our{" "}
          <Link href="/terms" className="underline hover:text-primary transition-colors cursor-pointer">
            Terms of Service
          </Link>{" "}
          and our{" "}
          <Link href="/privacy" className="underline hover:text-primary transition-colors cursor-pointer">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
};

export default FooterTextSection;
