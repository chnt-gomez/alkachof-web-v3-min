export class CurrencyUtil {
    static format(cents: number): string {
        if (isNaN(cents)) return '$ 0.00';
        const dollars = cents / 100;
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(dollars);
        return formatted.replace(/(\p{Sc})(\d)/u, '$1 $2');
    }

}