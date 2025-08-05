import useLocalSettingsStore from "@/store/localSettings";
import Link from "next/link";
import React, { ReactNode } from "react";
import { Trans } from "next-i18next";
import Logo from "@/components/Logo";

interface Props {
  text?: string;
  children: ReactNode;
  "data-testid"?: string;
}

export default function CenteredForm({
  text,
  children,
  "data-testid": dataTestId,
}: Props) {
  const { settings } = useLocalSettingsStore();

  return (
    <div
      className="absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center p-5"
      data-testid={dataTestId}
    >
      <div className="m-auto flex flex-col gap-2 w-full">
        {settings.theme && (
          <Logo 
            size="lg" 
            theme={settings.theme === "dark" ? "dark" : "light"}
          />
        )}
        {text && (
          <p className="text-lg max-w-[30rem] min-w-80 w-full mx-auto font-semibold px-2 text-center">
            {text}
          </p>
        )}
        {children}
        <p className="text-center text-xs text-neutral mb-5">
          <Trans
            values={{ date: new Date().getFullYear() }}
            i18nKey="all_rights_reserved"
            components={[
              <Link href="https://linkalbum.top" className="font-semibold" />,
            ]}
          />
        </p>
      </div>
    </div>
  );
}
