import type { SVGProps } from "react";

import { FALLBACK_ICON, ICONS } from "./icon-map";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: string;
  size?: number;
  strokeWidth?: number;
}

/** Resolve um ícone lucide pelo nome guardado no banco. */
export function Icon({ name, size = 16, strokeWidth = 1.75, ...rest }: IconProps) {
  const Cmp = ICONS[name] ?? FALLBACK_ICON;
  return <Cmp size={size} strokeWidth={strokeWidth} aria-hidden {...rest} />;
}
