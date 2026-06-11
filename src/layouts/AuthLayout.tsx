import { Outlet } from "react-router"

const AuthLayout = () => {
    return (
        <div>
            <p>Auth Layout</p>
            <Outlet />
        </div>
    )
}
export default AuthLayout
