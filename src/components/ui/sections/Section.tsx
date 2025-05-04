'use client';

import React from 'react';
import { Card, CardHeader, CardBody, CardFooter } from '../card/Card';

export interface SectionProps {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Section({
  id,
  title,
  description,
  children,
  footer,
  className = '',
}: SectionProps) {
  return (
    <section id={id} className={`w-full ${className}`}>
      <Card>
        <CardHeader className="flex flex-col gap-1.5 pb-0">
          <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400">{title}</h2>
          {description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm">{description}</p>
          )}
        </CardHeader>
        
        <CardBody className="pt-5 overflow-hidden">
          {children}
        </CardBody>
        
        {footer && (
          <CardFooter className="pt-5">
            {footer}
          </CardFooter>
        )}
      </Card>
    </section>
  );
} 