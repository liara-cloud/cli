
export default function getPort(deploymentType) {
    // @TODO should be customizable
    return ({
        node: 3000,
        static: 80,
        docker: 8000,
        laravel: 80
    })[deploymentType];
}
