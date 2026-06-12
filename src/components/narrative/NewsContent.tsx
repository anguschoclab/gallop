import React from "react";
import { Link } from "@tanstack/react-router";
import type { EntityLink } from "@/services/narrative/newsTypes";
import { useEntityLinks } from "@/hooks/shared/useEntityLinks";
import { cn } from "@/lib/cn";

interface NewsContentProps {
  text: string;
  links?: EntityLink[];
  className?: string;
  linkClassName?: string;
  autoDetect?: boolean;
}

/**
 * NewsContent - A component that renders news text (headline or body)
 * and automatically wraps recognized entity names in clickable Links.
 */
export const NewsContent: React.FC<NewsContentProps> = ({
  text,
  links: explicitLinks,
  className,
  linkClassName,
  autoDetect = true,
}) => {
  const finalLinks = useEntityLinks(text, explicitLinks, autoDetect);

  if (finalLinks.length === 0) {
    return <span className={className}>{text}</span>;
  }

  let parts: (string | React.ReactNode)[] = [text];

  finalLinks.forEach((link) => {
    const newParts: (string | React.ReactNode)[] = [];

    parts.forEach((part) => {
      if (typeof part !== "string") {
        newParts.push(part);
        return;
      }

      // Split the string by the entity name using regex for word boundaries
      // Wrap in capturing group so the separator is kept in the result array
      const regex = new RegExp(`(\\b${escapeRegExp(link.name)}\\b)`, "g");
      const segments = part.split(regex);

      segments.forEach((seg, i) => {
        if (seg === link.name) {
          newParts.push(
            <EntityLinkComponent
              key={`${link.type}-${link.id}-${i}-${link.name}`}
              link={link}
              className={linkClassName}
            />,
          );
        } else if (seg) {
          newParts.push(seg);
        }
      });
    });

    parts = newParts;
  });

  return <span className={className}>{parts}</span>;
};

const EntityLinkComponent: React.FC<{ link: EntityLink; className?: string }> = ({
  link,
  className,
}) => {
  const commonClasses = cn(
    "font-bold hover:underline transition-all decoration-dotted underline-offset-2 cursor-pointer relative z-10",
    className,
  );

  switch (link.type) {
    case "horse":
      return (
        <Link
          to="/stable/$horseId"
          params={{ horseId: link.id }}
          className={cn(commonClasses, "text-gold hover:text-gold-bright")}
        >
          {link.name}
        </Link>
      );
    case "jockey":
      return (
        <Link
          to="/jockey/$jockeyId"
          params={{ jockeyId: link.id }}
          className={cn(commonClasses, "text-blue-400 hover:text-blue-300")}
        >
          {link.name}
        </Link>
      );
    case "stable":
      return (
        <Link
          to="/npc-stables/$stableId"
          params={{ stableId: link.id }}
          className={cn(commonClasses, "text-success hover:text-success-dark")}
        >
          {link.name}
        </Link>
      );
    case "race":
      return (
        <Link
          to="/race/$raceId"
          params={{ raceId: link.id }}
          className={cn(commonClasses, "text-cream hover:text-white")}
        >
          {link.name}
        </Link>
      );
    default:
      return <span className={className}>{link.name}</span>;
  }
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

