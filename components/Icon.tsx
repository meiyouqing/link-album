import React, { forwardRef, useState, useEffect } from "react";
import type { IconProps, Icon as PhosphorIcon } from "@phosphor-icons/react";

type Props = {
  icon: string;
} & IconProps;

const Icon = forwardRef<SVGSVGElement, Props>(({ icon, ...rest }, ref) => {
  const [IconComponent, setIconComponent] = useState<PhosphorIcon | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadIcon = async () => {
      try {
        setIsLoading(true);
        const iconModule = await import("@phosphor-icons/react");
        const Component = iconModule[icon as keyof typeof iconModule] as PhosphorIcon;
        
        if (isMounted) {
          if (Component && typeof Component === 'function') {
            setIconComponent(() => Component);
          } else {
            setIconComponent(null);
          }
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setIconComponent(null);
          setIsLoading(false);
        }
      }
    };

    loadIcon();

    return () => {
      isMounted = false;
    };
  }, [icon]);

  if (isLoading) {
    return <div className="w-6 h-6" />;
  }

  if (!IconComponent) {
    return <div className="w-6 h-6" />;
  }

  return <IconComponent ref={ref} {...rest} />;
});

Icon.displayName = "Icon";

export default Icon;
