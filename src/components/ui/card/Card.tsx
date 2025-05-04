'use client';

import React from 'react';
import { Card as HeroCard, CardHeader as HeroCardHeader, CardBody as HeroCardBody, CardFooter as HeroCardFooter } from '@heroui/react';

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
    <HeroCard className={`border-none shadow-none ${className}`}>
      {children}
    </HeroCard>
  );
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <HeroCardHeader className={className}>
      {children}
    </HeroCardHeader>
  );
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <HeroCardBody className={className}>
      {children}
    </HeroCardBody>
  );
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <HeroCardFooter className={className}>
      {children}
    </HeroCardFooter>
  );
} 