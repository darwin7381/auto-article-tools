'use client';

import React from 'react';
import { Card as HeroCard, CardHeader as HeroCardHeader, CardBody as HeroCardBody, CardFooter as HeroCardFooter } from '@heroui/card';

export type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export type CardHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

export type CardBodyProps = {
  children: React.ReactNode;
  className?: string;
};

export type CardFooterProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return (
    <HeroCard 
      className={`${className}`}
      shadow="sm"
      radius="md"
      classNames={{
        base: "bg-background border-divider",
      }}
    >
      {children}
    </HeroCard>
  );
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <HeroCardHeader className={`pb-0 pt-5 px-5 ${className}`}>
      {children}
    </HeroCardHeader>
  );
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <HeroCardBody className={`py-5 px-5 ${className}`}>
      {children}
    </HeroCardBody>
  );
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <HeroCardFooter className={`pt-0 pb-5 px-5 ${className}`}>
      {children}
    </HeroCardFooter>
  );
} 