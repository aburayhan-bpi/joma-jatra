import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

// Official JomaJatra brand logo component using Next.js optimized Image
const Logo = ({ className, iconOnly = false }: LogoProps) => {
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <Image
        src={iconOnly ? "/joma-jatra-icononly.png" : "/joma-jatra.png"}
        alt="JomaJatra Logo"
        width={iconOnly ? 44 : 160}
        height={iconOnly ? 44 : 52}
        draggable={false}
        className="h-full w-auto object-contain"
        priority
      />
    </div>
  );
};

export default Logo;
