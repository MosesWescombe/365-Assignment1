type User = {
    auth_token: string,
    email: string,
    first_name: string,
    id: number,
    image_filename: string,
    last_name: string,
    password: string
}

type Auction = {
    category_id: number,
    description: string,
    end_date: Date,
    id: number,
    image_filename: string,
    reserve: number,
    seller_id: number,
    title: string
}

type Category = {
    id: number,
    name: string
}

type Bid = {
    amount: number,
    auction_id: number,
    id: number,
    timestamp: Date,
    user_id: number
}