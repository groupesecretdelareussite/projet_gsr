"use client";

import { PhoneInput as ReactPhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

/** §8.3 GSR_ARCHITECTURE.md — champ téléphone international, Bénin par défaut. */
export function PhoneInput({ value, onChange, required }: PhoneInputProps) {
  return (
    <ReactPhoneInput
      defaultCountry="bj"
      value={value}
      onChange={onChange}
      required={required}
      inputClassName="!w-full !py-2.5 !text-sm !border-gray-200 focus:!ring-2 focus:!ring-primary/20 focus:!border-primary"
      countrySelectorStyleProps={{ buttonClassName: "!border-gray-200" }}
    />
  );
}
