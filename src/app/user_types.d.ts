type User = {
    auth_token: string,
    email: string,
    first_name: string,
    /**
     * id as defined by the database
     */
    id: number,
    image_filename: string,
    last_name: string,
    password: string
}