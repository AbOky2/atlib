import { configureStore } from "@reduxjs/toolkit";
import basketReducer from "./features/basketSlice";
import restaurantReducer from "./features/restaurantSlice";
import addressReducer from "./features/addressSlice";
import orderReducer from "./features/orderSlice";

export const store = configureStore({
    reducer:{
        basket : basketReducer,
        restaurant : restaurantReducer,
        address : addressReducer,
        order : orderReducer
    }
});