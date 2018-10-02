
export default function getPort(deploymentType) {
    return ({
        node: null,
        static: 5000,
        docker: null,
        laravel: 80
    })[deploymentType];
}
