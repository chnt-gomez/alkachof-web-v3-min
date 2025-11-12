const mockRelatedProducts = [
    { id: 101, alt: "Black leather pumps", src: "path/to/pump-thumb.jpg" },
    { id: 102, alt: "Silver stiletto sandals", src: "path/to/sandal-thumb.jpg" },
    { id: 103, alt: "Red velvet flats", src: "path/to/flats-thumb.jpg" },
    { id: 104, alt: "Classic black booties", src: "path/to/bootie-thumb.jpg" },
    { id: 105, alt: "Suede ankle boots", src: "path/to/suede-thumb.jpg" },
];

export const ProductsReelFrame = () => {
    return (
       <div className="p-4 mt-4">
            {/* Reel Title */}
            <h3>Related Products</h3>

            {/* The horizontal reel container */}
            {/* * flex: enables the horizontal layout.
              * space-x-4: adds horizontal space between items.
              * overflow-x-scroll: enables horizontal scrolling when items run off screen.
              * whitespace-nowrap: prevents items from wrapping to the next line.
            */}
            <div className="flex space-x-4 mt-3 pb-2 overflow-x-scroll whitespace-nowrap scrollbar-hide">
                
                {mockRelatedProducts.map((product) => (
                    // Each item in the reel
                    <div 
                        key={product.id} 
                        // flex-shrink-0 ensures the item doesn't shrink to fit the container
                        // w-28 or w-32 defines the fixed width of the thumbnail area
                        className="flex-shrink-0 w-32 cursor-pointer"
                    >
                        {/* Placeholder for the product image/thumbnail */}
                        <div className="w-full h-32 bg-gray-200 flex items-center justify-center rounded-md shadow-sm">
                            {/* In a real app, this would be an <img> tag */}
                            <span className="text-sm">Thumbnail {product.id}</span>
                        </div>
                        
                        {/* Placeholder for product name/price */}
                        <p className="text-sm mt-1">{product.alt}</p>
                    </div>
                ))}
                
            </div>
        </div>
    )
}