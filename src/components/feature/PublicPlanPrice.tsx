import './public-plan-price.css';

// Presentation only. Payment amounts and provider selection live in checkout.
export default function PublicPlanPrice() {
  return <>
    <span className="public-plan-price-usd"><span className="public-plan-price-currency">US$</span>14.99</span>
    <span className="public-plan-price-cop">COP $49.900</span>
  </>;
}
