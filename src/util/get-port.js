
export default function getPort(deploymentType) {
    // @TODO should be customizable
    return ({
        node: 3000,
        static: 5000,
        docker: 8000,
        laravel: 80
    })[deploymentType];
}
