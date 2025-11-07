import { CurrencyUtil } from "../../util/currencyFormatter"

type ProductDetailsFrameProps = {
    title: string,
    price: number,
    description: string
}

export const ProductDetailFrame: React.FC<ProductDetailsFrameProps> = ({ title, price, description }: ProductDetailsFrameProps) => {
    return <div className="p-4">
        <h1 className="text-[1.4rem] fond-bold my-2">{title}</h1>
        <p className="text-[1.2rem] font-bold text-brand mb-3">
            {CurrencyUtil.format(price)}</p>
        <p className="text-[0.95rem] leading-snug text-gray-600">
            {description}
        </p>
    </div>
}