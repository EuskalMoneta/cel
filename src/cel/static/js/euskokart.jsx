import {
    fetchAuth,
    getAPIBaseURL,
} from 'Utils'

import {
    BootstrapTable,
    TableHeaderColumn,
} from 'react-bootstrap-table'
import 'node_modules/react-bootstrap-table/dist/react-bootstrap-table.min.css'


class EuskoKartButtons extends React.Component {
    render()
    {
        if (this.props.status === 'ACTIVE') {
            var buttonEuskoKart = (
                <button onClick={() => { this.props.lockEuskoKart(this.props.beneficiaire) }}
                        className="btn btn-warning enable-pointer-events">
                        {__("Faire opposition")} <i className="glyphicon glyphicon-lock"></i>
                </button>
            )
        }
        else {
            var buttonEuskoKart = (
                <button onClick={() => { this.props.lockEuskoKart(this.props.beneficiaire) }}
                        className="btn btn-success enable-pointer-events">
                        {__("Débloquer")} <i className="glyphicon glyphicon-ok"></i>
                </button>
            )
        }

        return buttonEuskoKart
    }
}


var EuskoKartList = React.createClass({

    getInitialState() {
        return {
            EuskoKartList: Array(),
        }
    },

    componentDidMount() {
        var getEuskoKartList = (data) => {
            // Get EuskoKartList
            var EuskoKartList = _.chain(data.results.tokens)
                                 .sortBy((item) => {return item.id})
                                 .value()

            this.setState({EuskoKartList: EuskoKartList})
        }
        fetchAuth(this.props.EuskoKartUrl, 'GET', getEuskoKartList)
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
                else {
                    debugger
                    // window.location.assign(this.props.url + row.login)
                }
            }
        }

        var buttonFormatter = (cell, row) => {
            debugger
            return (
                <EuskoKartButtons status={row} url={this.props.EuskoKartUrl} />
            )
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
                            <TableHeaderColumn dataField="actions" columnClassName="disable-pointer-events" width="150"
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