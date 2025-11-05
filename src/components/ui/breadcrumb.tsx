import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  separator?: React.ReactNode;
  className?: string;
}

export interface BreadcrumbItemProps
  extends React.ComponentPropsWithoutRef<"li"> {
  className?: string;
}

export interface BreadcrumbLinkProps
  extends React.ComponentPropsWithoutRef<"a"> {
  asChild?: boolean;
  className?: string;
}

export interface BreadcrumbPageProps
  extends React.ComponentPropsWithoutRef<"span"> {
  className?: string;
}

export interface BreadcrumbSeparatorProps
  extends React.ComponentPropsWithoutRef<"li"> {
  className?: string;
}

export interface BreadcrumbEllipsisProps
  extends React.ComponentPropsWithoutRef<"li"> {
  className?: string;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  (
    {
      className,
      separator = <ChevronRightIcon className="h-4 w-4" />,
      ...props
    },
    ref
  ) => {
    return (
      <nav
        ref={ref}
        className={cn("relative", className)}
        aria-label="breadcrumbs"
        {...props}
      />
    );
  }
);
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => {
  return (
    <ol
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  );
});
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, ...props }, ref) => {
    return (
      <li
        ref={ref}
        className={cn("inline-flex items-center gap-1.5", className)}
        {...props}
      />
    );
  }
);
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ asChild, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "a";
    return (
      <Comp
        ref={ref}
        className={cn(
          "transition-colors hover:text-foreground flex items-center",
          className
        )}
        {...props}
      />
    );
  }
);
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn("font-normal text-foreground", className)}
        aria-current="page"
        {...props}
      />
    );
  }
);
BreadcrumbPage.displayName = "BreadcrumbPage";

const BreadcrumbSeparator = React.forwardRef<
  HTMLLIElement,
  BreadcrumbSeparatorProps
>(({ className, ...props }, ref) => {
  return (
    <li ref={ref} className={cn("text-muted-foreground", className)} {...props}>
      <ChevronRightIcon className="h-4 w-4" />
    </li>
  );
});
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbEllipsis = React.forwardRef<
  HTMLLIElement,
  BreadcrumbEllipsisProps
>(({ className, ...props }, ref) => {
  return (
    <li
      ref={ref}
      className={cn("flex items-center text-muted-foreground", className)}
      {...props}
    >
      <MoreHorizontalIcon className="h-4 w-4" />
      <span className="sr-only">更多</span>
    </li>
  );
});
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
