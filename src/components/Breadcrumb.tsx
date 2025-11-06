"use client";

import { usePathname } from "next/navigation";
import { Fragment } from "react/jsx-runtime";
import { capitalizeFirstLetter } from "@/helpers/capitalizeFirstLetter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "./ui/breadcrumb";

export function BreadcrumbComponent() {
  const pathname = usePathname();
  const segments = pathname?.split("/").filter(Boolean) ?? [];
  const lastSegment = segments[segments.length - 1];
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink>
            {capitalizeFirstLetter({ text: lastSegment })}
          </BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
