import { icons as iconData } from "@phosphor-icons/core";
import { IconEntry as CoreEntry } from "@phosphor-icons/core";
import type { Icon } from "@phosphor-icons/react";

interface IconEntry extends CoreEntry {
  Icon: Icon;
}

// Don't import all icons at once - use icon data from core package
export const icons: ReadonlyArray<Omit<IconEntry, 'Icon'>> = iconData.map((entry) => ({
  ...entry,
}));

// Dynamic icon loading helper
export const loadIcon = async (iconName: string): Promise<Icon | null> => {
  try {
    const iconModule = await import("@phosphor-icons/react");
    const IconComponent = iconModule[iconName as keyof typeof iconModule] as Icon;
    return IconComponent && typeof IconComponent === 'function' ? IconComponent : null;
  } catch (error) {
    console.warn(`Failed to load icon: ${iconName}`, error);
    return null;
  }
};

export const iconCount = Intl.NumberFormat("en-US").format(icons.length * 6);
