import {
    fetchAuth,
    titleCase,
    getAPIBaseURL,
} from 'Utils'

import {
    BootstrapTable,
    TableHeaderColumn,
} from 'react-bootstrap-table'
import 'node_modules/react-bootstrap-table/dist/react-bootstrap-table.min.css'


class EuskoKartButtons extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            buttonEnabled: props.buttonEnabled,
        }
    }

    componentWillReceiveProps(nextProps) {
        this.setState(nextProps)
    }

    blockEuskoKart(euskokart_id) {
        this.props.disableButton()

        var lockEuskoKartQuery = (data) => {
            this.props.getEuskoKartList()
        }
        fetchAuth(getAPIBaseURL + "euskokart-block/?id=" + euskokart_id, 'GET', lockEuskoKartQuery)
    }

    unlockEuskoKart(euskokart_id) {
        this.props.disableButton()

        var unlockEuskoKartQuery = (data) => {
            this.props.getEuskoKartList()
        }
        fetchAuth(getAPIBaseURL + "euskokart-unblock/?id=" + euskokart_id, 'GET', unlockEuskoKartQuery)
    }

    render() {
        if (this.props.euskokart.status === 'Active') {
            if (this.state.buttonEnabled) {
                var buttonEuskoKart = (
                    <button onClick={() => { this.blockEuskoKart(this.props.euskokart.id) }}
                            className="btn btn-warning enable-pointer-events">
                            {__("Faire opposition")} <i className="glyphicon glyphicon-lock"></i>
                    </button>
                )
            }
            else {
                var buttonEuskoKart = (
                    <button onClick={() => { this.blockEuskoKart(this.props.euskokart.id) }}
                            disabled className="btn btn-warning enable-pointer-events">
                            {__("Faire opposition")} <i className="glyphicon glyphicon-lock"></i>
                    </button>
                )
            }
        }
        else {
            if (this.state.buttonEnabled) {
                var buttonEuskoKart = (
                    <button onClick={() => { this.unlockEuskoKart(this.props.euskokart.id) }}
                            className="btn btn-success enable-pointer-events">
                            {__("Débloquer")} <i className="glyphicon glyphicon-ok"></i>
                    </button>
                )
            }
            else {
                var buttonEuskoKart = (
                    <button onClick={() => { this.unlockEuskoKart(this.props.euskokart.id) }}
                            disabled className="btn btn-success enable-pointer-events">
                            {__("Débloquer")} <i className="glyphicon glyphicon-ok"></i>
                    </button>
                )
            }
        }

        return buttonEuskoKart
    }
}


var EuskoKartList = React.createClass({

    getInitialState() {
        return {
            EuskoKartList: Array(),
            buttonEnabled: true,
        }
    },


    enableButton() {
        this.setState({buttonEnabled: true})
    },

    disableButton() {
        this.setState({buttonEnabled: false})
    },

    getEuskoKartList() {
        var getEuskoKartData = (data) => {
            // Get getEuskoKartList
            var EuskoKartList = _.chain(data)
                                 .map((item) => {
                                    if (item.status == 'ACTIVE')
                                        item.status = titleCase(item.status)
                                    else
                                        item.status = 'Bloquée'

                                    return item
                                 })
                                 .sortBy((item) => { return item.status })
                                 .value()
            
            this.setState({EuskoKartList: EuskoKartList}, this.enableButton)
        }
        fetchAuth(this.props.EuskoKartUrl, 'GET', getEuskoKartData)
    },

    componentDidMount() {
        this.getEuskoKartList()
    },

    render() {
        const options = {
            sizePerPage: 20,
            hideSizePerPage: true,
            noDataText: __("Aucune EuskoKart enregistrée."),
        }

        const selectRowProp = {
            mode: 'radio',
            hideSelectColumn: true,
            clickToSelect: true,
            onSelect: (row, isSelected, event) => {
                // We want to disable click on cell #2 (the third one, which is our delete button)
                if (event.target.localName == "button" || event.target.localName == "i" || event.target.cellIndex == 2) {
                    return false
                }
            }
        }

        var buttonFormatter = (cell, row) => {
            return <EuskoKartButtons euskokart={row}
                                     getEuskoKartList={this.getEuskoKartList} 
                                     enableButton={this.enableButton}
                                     disableButton={this.disableButton}
                                     buttonEnabled={this.state.buttonEnabled}
                   />
        }

        return (
            <div className="row">
                <div className="row">
                    <div className="col-md-9 col-md-offset-1 search-results">
                        <BootstrapTable data={this.state.EuskoKartList} striped={true} hover={true}
                            selectRow={selectRowProp} options={options}
                            tableContainerClass="react-bs-table-list-euskokart"
                        >
                            <TableHeaderColumn isKey={true} hidden={true} dataField="id">{__("ID")}</TableHeaderColumn>
                            <TableHeaderColumn dataField="value">{__("Numéro de carte")}</TableHeaderColumn>
                            <TableHeaderColumn dataField="status" width="350">{__("Statut")}</TableHeaderColumn>
                            <TableHeaderColumn dataField="actions" columnClassName="disable-pointer-events" width="350"
                                               dataFormat={buttonFormatter}>{__("Action")}</TableHeaderColumn>
                        </BootstrapTable>
                    </div>
                </div>
            </div>
        )
    }
})


ReactDOM.render(
    <EuskoKartList EuskoKartUrl={getAPIBaseURL + "euskokart/"} />,
    document.getElementById('euskokart')
)
document.title = __("Mes virements") + ": " + __("EuskoKart") + " - " + __("Compte en ligne") + " " + document.title