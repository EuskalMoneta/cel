import {
    Modal,
    ModalHeader,
    ModalTitle,
    ModalClose,
    ModalBody,
    ModalFooter
} from 'react-modal-bootstrap'

export default class ModalEusko extends React.Component {
    constructor(props) {
        super(props);

        // Compute body (from props with labels and user data)
        var modalBody = this.props.modalBody

        this.state = this.props
    }

    computeModalBody(modalBody) {
        return _.chain(modalBody)
                .filter((item) => { return item })
                .sortBy((item) => { return item.order })
                .map((item) => {
                    return (<div className="form-group row" key={item.label}>
                            <label className="col-sm-4">{item.label} :</label>
                            <div className="col-sm-6">
                                <span>{item.value}</span>
                            </div>
                        </div>)
                })
                .value()
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps) {
            if (nextProps.staticContent) {
                this.setState(nextProps)
            }
            else {
                // We need to do this because nextProps is read-only...
                var newProps = _.mapObject(nextProps, (item) => { return item })

                // Compute modalBody from new prop
                newProps.modalBody = this.computeModalBody(newProps.modalBody)

                // Display modalBody
                this.setState(newProps)
            }
        }
    }

    onValidate() {
        this.setState({isModalOpen: false}, this.props.onValidate)
    }

    render() {
        if (this.props.btnValidateEnabled) {
            var validateButton = (
                <button className={"btn" + " " + this.props.btnValidateClass}
                        data-eusko="validate-modal" onClick={this.onValidate.bind(this)}>
                            {this.props.validateLabel}
                </button>
            )
        }
        else {
            var validateButton = (
                <button className={"btn" + " " + this.props.btnValidateClass}
                        data-eusko="validate-modal" onClick={this.onValidate.bind(this)}
                    disabled="disabled">
                        {this.props.validateLabel}
                    </button>
            )
        }

        return (
            <Modal isOpen={this.state.isModalOpen} onRequestHide={this.props.hideModal}>
                <ModalHeader>
                    <ModalClose onClick={this.props.hideModal}/>
                    <ModalTitle>{this.props.modalTitle}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div>{this.state.modalBody}</div>
                </ModalBody>
                <ModalFooter>
                    <button className="btn btn-default" onClick={this.props.hideModal}>
                      {this.props.cancelLabel}
                    </button>
                    {validateButton}
                </ModalFooter>
            </Modal>
        )
    }
}

// Specifies default values and type checking for props
ModalEusko.defaultProps = {
    cancelLabel: __("Annuler"),
    validateLabel: __("Valider"),
    modalTitle: __("Confirmation"),
    btnValidateClass: "btn-success",
    btnValidateEnabled: false,
}

ModalEusko.propTypes = {
    onValidate: React.PropTypes.func.isRequired,
    isModalOpen: React.PropTypes.bool.isRequired,
    staticContent: React.PropTypes.bool.isRequired,
    modalBody: React.PropTypes.oneOfType([React.PropTypes.array, React.PropTypes.object])
}
