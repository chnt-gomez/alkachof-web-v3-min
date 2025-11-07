import { describe, expect, test } from "vitest";
import { CurrencyUtil } from "./currencyFormatter";

describe('currencyFormatter', () => {
    test('should format correctly a cent', () => {
        const cents = 1;
        const formatted = CurrencyUtil.format(cents);

        expect(formatted).toEqual("$ 0.01");
    });

    test('should format correctly 10 cents', () => {
        const cents = 10;
        const formatted = CurrencyUtil.format(cents);

        expect(formatted).toEqual("$ 0.10");
    });

    test('should format correclty 100 cents', () => {
        const cents = 100;
        const formatted = CurrencyUtil.format(cents);

        expect(formatted).toEqual("$ 1.00");
    });

    test('should format correctly 1000 cents', () => {
        const cents = 1000;
        const formatted = CurrencyUtil.format(cents);

        expect(formatted).toEqual("$ 10.00");
    });

    test('should format correctly 1,000,000 cents', () => {
        const cents = 1000000;
        const formatted = CurrencyUtil.format(cents);

        expect(formatted).toEqual("$ 10,000.00");
    });

    test('should format correctly NaN values', () => {
        const cents = NaN;
        const formatted = CurrencyUtil.format(cents);
        expect(formatted).toEqual("$ 0.00");
    })
});